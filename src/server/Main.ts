import * as http from "http";
import * as os from "os";
import * as url from "url";

import * as Express from "express";
import * as minimist from "minimist";

import { ApplicationWebPageMiddlewareConfig, buildApplicationWebPageMiddleware } from "./ApplicationWebPage";
import { BasicRequestInfo } from "./BasicRequestInfo";
import { ClientManifest, readManifest } from "./ClientManifest";

const ASSETS_MOUNT_PATH = "/assets/"

export type ApplicationConfig = {
  https: boolean;
  manifest: ClientManifest;
  assetsMountPath: string;
  assetsHandler: Express.RequestHandler;
  clientAssetsHostUrl?: (req: BasicRequestInfo) => string;
}

export function buildApplicationWebPageMiddlewareConfig(config: ApplicationConfig): ApplicationWebPageMiddlewareConfig {
  const getClientAssetHostUrlFn = () => {
    if (config.clientAssetsHostUrl) {
      return config.clientAssetsHostUrl;
    }

    return (req: BasicRequestInfo) => {
      const host = `${req.protocol}://${req.headers["host"]}/`;
      const basePath = req.baseUrl + "/";
      return url.resolve(host, basePath);
    };
  };

  const clientAssetsHostUrl = getClientAssetHostUrlFn();

  return {
    manifest: config.manifest,
    clientAssetsBaseUrl: (req: Express.Request) => {
      return url.resolve(clientAssetsHostUrl(req), config.assetsMountPath);
    },
  };
}

function buildApplication(config: ApplicationConfig): Express.Application {
  const app = Express();
  app.disable("x-powered-by");
  app.enable("trust proxy");

  app.use((req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
    // Disable HTTP persistent connections until we need them.
    // keep-alive connections introduce a lot of complexity around graceful shutdown
    // that I'm avoiding for now
    res.setHeader("Connection", "close");
    next();
  });

  app.use(config.assetsMountPath, config.assetsHandler);

  const webPageMiddlewareConfig = buildApplicationWebPageMiddlewareConfig(config);
  app.use(buildApplicationWebPageMiddleware(webPageMiddlewareConfig));

  return app;
}

export type RunningServer = {
  port: number;
  shutdown(): Promise<void>;
}

export async function startServer(app: Express.Application, port: number): Promise<RunningServer> {
  const server = http.createServer(app);

  const closeServer = (): Promise<void> => {
    return new Promise<void>((resolve) => server.close(() => resolve()));
  }

  const start = (): Promise<number> => {
    return new Promise((resolve, reject) => {
      server.listen(port, (error: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(server.address().port)
        }
      });
    });
  }

  const actualPort = await start();

  return {
    port: actualPort,
    shutdown: closeServer,
  };
}

export type CommandLineArguements = {
  bundlePath: string;
  port: number;
}

export type CommandLineArguementsParseResult = CommandLineArguements | string;

export function isUsageError(result: CommandLineArguementsParseResult): result is string {
  return (typeof result === "string");
}

const usage = `
Options:
  --port        Port to listen on. Default 8080.
  --bundlePath  Required. Path to the compiled Client bundle (i.e. directory where the
                manifest.json lives).
`;

export function parseCommandLineArgs(args: string[]): CommandLineArguementsParseResult {
  let errorMessages: string[] = [];
  const parsedArgs = minimist(args, {
    string: ["port", "bundlePath"],
    default: {
      port: "8080",
    },
    stopEarly: false,
    "--": false,
  });

  const validatedArguements: { [key: string]: any } = {};
  const rawPort = parsedArgs["port"];
  const parsedPort: number = parseInt(rawPort, 10);
  if (isNaN(parsedPort)) {
    errorMessages.push("--port must be an integer");
  } else {
    validatedArguements["port"] = parsedPort;
  }

  const bundlePath = parsedArgs["bundlePath"];
  if (!bundlePath) {
    errorMessages.push("--bundlePath is required");
  } else {
    validatedArguements["bundlePath"] = bundlePath;
  }

  if (errorMessages.length > 0) {
    return `${errorMessages.join(os.EOL)}${os.EOL}${usage}`;
  }

  return validatedArguements as CommandLineArguements;
}

async function listenForProcessSignal(_process: NodeJS.Process, signal: string): Promise<string> {
  return new Promise<string>((resolve) => {
    _process.on(signal, () => resolve(signal));
  });
}

export async function run(config: ApplicationConfig, port: number): Promise<void> {
  const app = buildApplication(config);
  const runningServer = await startServer(app, port);

  console.log(`Server started; Port=${runningServer.port} PID=${process.pid}`);

  const receivedSignal = await Promise.race([
    listenForProcessSignal(process, "SIGINT"),
    listenForProcessSignal(process, "SIGTERM"),
  ]);

  const shutdownPromise = runningServer.shutdown();

  console.log(`Received ${receivedSignal}; shutting down server`);

  await shutdownPromise;

  console.log("Server stopped; all requests complete and connections closed");
}

export async function main(args: string[]): Promise<number> {
  try {
    const result = parseCommandLineArgs(args);
    if (isUsageError(result)) {
      console.error(result);
      return 1;
    } else {
      const manifest = await readManifest(result.bundlePath);

      await run({
        https: false,
        manifest: manifest,
        assetsMountPath: ASSETS_MOUNT_PATH,
        assetsHandler: Express.static(manifest.publicDirectoryPath),
      }, result.port);

      return 0;
    }
  } catch (e) {
    console.error(e);
    return 1;
  }
}

if (require.main === module) {
  main(process.argv).then((exitCode) => process.exit(exitCode));
}
