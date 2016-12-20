import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as url from "url";

import * as Express from "express";
import * as jsonschema from "jsonschema";
import * as yargs from "yargs";

import { buildApplicationWebPageMiddleware } from "./ApplicationWebPageMiddleware";

export function buildOriginClientAssetBaseUrl(req: Express.Request, assetsMountPath: string): string {
  const host = `${req.protocol}://${req.headers["host"]}/`;
  const serverBaseUrl = url.resolve(host, req.baseUrl + "/");
  return url.resolve(serverBaseUrl, assetsMountPath);
}

export type ClientManifest = {
  mainScriptName: string;
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
		"clientMainModuleName": {
			"type": "string",
		},
		"publicDirectoryPath": {
			"type": "string",
		}
	},
	"required": [
		"mainScriptName",
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

  app.use(assetsMountPath, Express.static(path.join(bundlePath, manifest.publicDirectoryPath)));

  const mainScriptNamePromise = Promise.resolve(manifest.mainScriptName);
  app.use(buildApplicationWebPageMiddleware({
    mainScriptName: () => mainScriptNamePromise,
    clientMainModuleName: manifest.clientMainModuleName,
    clientAssetsBaseUrl: (req) => buildOriginClientAssetBaseUrl(req, assetsMountPath),
  }));

  return app;
}

type ServerListeningState = {
  shutdown(): Promise<ServerShuttingDownState>;
}

type ServerShuttingDownState = {
  remainingOpenConnections: number;
  doneShuttingDownPromise: Promise<void>;
}

async function startServer(app: Express.Application, port: number, keepAlive: boolean, socketTimeout: number): Promise<ServerListeningState> {
  const wrapperApp = Express();
  wrapperApp.set("x-powered-by", false);

  wrapperApp.use((req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
    const connectionHeaderValue = keepAlive ? "keep-alive" : "close";
    res.setHeader("Connection", connectionHeaderValue);
    next();
  });

  wrapperApp.use(app);

  const server = http.createServer(wrapperApp);
  server.addListener("connection", (socket) => {
    socket.setTimeout(socketTimeout);
  });

  const getOpenConnections = (): Promise<number> => {
    return new Promise((resolve) => {
      server.getConnections((err, count) => resolve(count));
    });
  }

  const closeServer = (): Promise<void> => {
    return new Promise<void>((resolve) => server.close(() => resolve()));
  }

  const safeShutdownServer = async (): Promise<ServerShuttingDownState> => {
    keepAlive = false;
    return {
      remainingOpenConnections: await getOpenConnections(),
      doneShuttingDownPromise: closeServer(),
    };
  }

  const start = (): Promise<void> => {
    return new Promise<void>((resolve) => {
      server.listen(port, () => resolve());
    });
  }

  await start();

  return {
    shutdown: safeShutdownServer,
  };
}

export type ServerConfig = {
  bundlePath: string;
  keepAlive: boolean;
  port: number;
  socketTimeout: number;
}

export type ParsedArgsResult = ServerConfig | string;

export function isParseArgsResultSuccess(result: ParsedArgsResult): result is ServerConfig {
  return (typeof result === "object");
}

export function isParseArgsResultFail(result: ParsedArgsResult): result is string {
  return (typeof result === "string");
}

export function parseArgs(args: string[]): ParsedArgsResult {
  let errorMessage: string | null = null;

  const coerceInteger = (name: string) => {
    return (rawValue: string) => {
      const value = parseInt(rawValue, 10);
      if (isNaN(value)) {
        throw new Error(`${name} must be an integer`);
      }
      return value;
    }
  }

  const argv: any = yargs(args)
    .strict()
    .option("socketTimeout", {
      demand: true,
      describe: "Close open sockets after <timeout> milliseconds of inactivity.",
      type: "number",
      coerce: coerceInteger("socketTimeout"),
    })
    .option("port", {
      demand: true,
      describe: "Port to listen on.",
      type: "number",
      coerce: coerceInteger("port"),
    })
    .option("keepAlive", {
      demand: true,
      describe: "Enable HTTP Persisent Connections.",
      type: "boolean",
    })
    .option("bundlePath", {
      demand: true,
      describe: "Path to the compiled Client bundle (i.e. directory where the manifest.json lives).",
      type: "string",
    })
    .fail((msg: string, err: Error, yargs: any) => {
      errorMessage = `${msg}\n\n${yargs.help()}`;
    })
    .argv

  if (errorMessage) {
    return errorMessage;
  } else {
    return argv as ServerConfig;
  }
}

async function listenForProcessSignal(_process: NodeJS.Process, signal: string): Promise<string> {
  return new Promise<string>((resolve) => {
    _process.on(signal, () => resolve(signal));
  });
}

export async function run(config: ServerConfig): Promise<void> {
  const manifest = await readManifest(config.bundlePath);
  const app = buildApplication(manifest, config.bundlePath);

  const serverListeningState = await startServer(app, config.port, config.keepAlive, config.socketTimeout);

  console.log(`Server started; Port=${config.port} PID=${process.pid}`);

  const receivedSignal = await Promise.race([
    listenForProcessSignal(process, "SIGINT"),
    listenForProcessSignal(process, "SIGTERM")
  ]);

  const serverShuttingDownState = await serverListeningState.shutdown();
  const remainingOpenConnections = serverShuttingDownState.remainingOpenConnections;

  if (remainingOpenConnections > 0) {
    console.log(`Received ${receivedSignal}; waiting for open ${remainingOpenConnections} connections to close before exiting`);
  } else {
    console.log(`Received ${receivedSignal}; shutting down server`);
  }

  await serverShuttingDownState.doneShuttingDownPromise;

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
