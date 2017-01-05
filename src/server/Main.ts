import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as url from "url";
import * as os from "os";

import * as Express from "express";
import * as jsonschema from "jsonschema";
import * as minimist from "minimist";

import { buildApplicationWebPageMiddleware } from "./ApplicationWebPageMiddleware";

export function buildOriginClientAssetBaseUrl(req: Express.Request, assetsMountPath: string): string {
  const host = `${req.protocol}://${req.headers["host"]}/`;
  const serverBaseUrl = url.resolve(host, req.baseUrl + "/");
  return url.resolve(serverBaseUrl, assetsMountPath);
}

export type ClientManifest = {
  mainScriptName: string;
  mainCssName: string;
  clientMainModuleName: string;
  publicDirectoryPath: string;
}

const clientManifestJsonSchema = {
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
  	"mainScriptName": {
  		"type": "string",
    },
    "mainCssName": {
  		"type": "string",
  	},
  	"clientMainModuleName": {
  		"type": "string",
  	},
  	"publicDirectoryPath": {
  		"type": "string",
  	}
  },
  "required": [
  	"mainScriptName",
    "mainCssName",
  	"clientMainModuleName",
  	"publicDirectoryPath",
  ],
};

function readFileAsync(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(path, { encoding: "utf8", flag: "r" }, (err, content) => {
      if (err) {
        reject(err);
      } else {
        resolve(content);
      }
    });
  });
}

async function readManifest(bundle: string) {
  const manifestPath = path.join(bundle, "manifest.json");
  const rawManifest = await readFileAsync(manifestPath);
  const parsedManifest = JSON.parse(rawManifest);

  const validationResult = jsonschema.validate(parsedManifest, clientManifestJsonSchema)

  if (validationResult.valid) {
    return {
      mainScriptName: parsedManifest["mainScriptName"],
      mainCssName: parsedManifest["mainCssName"],
      clientMainModuleName: parsedManifest["clientMainModuleName"],
      publicDirectoryPath: parsedManifest["publicDirectoryPath"],
    };
  } else {
    const errors = validationResult.errors.map((e) => `  * ${e.property} ${e.message}`).join("\n");
    const errorMessage = `Manifest is invalid -> ${manifestPath}\n${errors}`;
    throw new Error(errorMessage);
  }
}

const ASSETS_MOUNT_PATH = "/assets/"

function buildApplication(manifest: ClientManifest, bundlePath: string, assetsMountPath: string = ASSETS_MOUNT_PATH): Express.Application {
  const app = Express();
  app.disable("x-powered-by");

  app.use((req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
    // Disable HTTP persistent connections until we need them.
    // keep-alive connections introduce a lot of complexity around graceful shutdown
    // that I'm avoiding for now
    res.setHeader("Connection", "close");
    next();
  });

  app.use(assetsMountPath, Express.static(path.join(bundlePath, manifest.publicDirectoryPath)));

  const mainScriptNamePromise = Promise.resolve(manifest.mainScriptName);
  const mainCssNamePromise = Promise.resolve(manifest.mainCssName);
  app.use(buildApplicationWebPageMiddleware({
    mainScriptName: () => mainScriptNamePromise,
    mainCssName: () => mainCssNamePromise,
    clientMainModuleName: manifest.clientMainModuleName,
    clientAssetsBaseUrl: (req) => buildOriginClientAssetBaseUrl(req, assetsMountPath),
  }));

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

export type ServerConfig = {
  bundlePath: string;
  port: number;
}

export type ParsedArgsResult = ServerConfig | string;

export function isParseArgsResultSuccess(result: ParsedArgsResult): result is ServerConfig {
  return (typeof result === "object");
}

export function isParseArgsResultFail(result: ParsedArgsResult): result is string {
  return (typeof result === "string");
}

const usage = `
Options:
  --port        Port to listen on. Default 8080.
  --bundlePath  Required. Path to the compiled Client bundle (i.e. directory where the
                manifest.json lives).
`;

export function parseArgs(args: string[]): ParsedArgsResult {
  let errorMessages: string[] = [];
  const parsedArgs = minimist(args, {
    string: ["port", "bundlePath"],
    default: {
      "port": "8080",
    },
    stopEarly: false,
    "--": false,
  });

  const serverConfig: { [key: string]: any } = {};
  const rawPort = parsedArgs["port"];
  const parsedPort: number = parseInt(rawPort, 10);
  if (isNaN(parsedPort)) {
    errorMessages.push("--port must be an integer");
  } else {
    serverConfig["port"] = parsedPort;
  }

  const bundlePath = parsedArgs["bundlePath"];
  if (!bundlePath) {
    errorMessages.push("--bundlePath is required");
  } else {
    serverConfig["bundlePath"] = bundlePath;
  }

  if (errorMessages.length > 0) {
    return `${errorMessages.join(os.EOL)}${os.EOL}${usage}`;
  }

  return serverConfig as ServerConfig;
}

async function listenForProcessSignal(_process: NodeJS.Process, signal: string): Promise<string> {
  return new Promise<string>((resolve) => {
    _process.on(signal, () => resolve(signal));
  });
}

export async function run(config: ServerConfig): Promise<void> {
  const manifest = await readManifest(config.bundlePath);
  const app = buildApplication(manifest, config.bundlePath);

  const runningServer = await startServer(app, config.port);

  console.log(`Server started; Port=${runningServer.port} PID=${process.pid}`);

  const receivedSignal = await Promise.race([
    listenForProcessSignal(process, "SIGINT"),
    listenForProcessSignal(process, "SIGTERM")
  ]);

  const shutdownPromise = runningServer.shutdown();

  console.log(`Received ${receivedSignal}; shutting down server`);

  await shutdownPromise;

  console.log("Server stopped; all requests complete and connections closed");
}

export async function main(args: string[]): Promise<number> {
  try {
    const result = parseArgs(args);
    if (isParseArgsResultSuccess(result)) {
      await run(result);
      return 0;
    } else {
      console.error(result);
      return 1;
    }
  } catch(e) {
    console.error(e);
    return 1;
  }
}

if (require.main === module) {
  main(process.argv).then((exitCode) => process.exit(exitCode));
}
