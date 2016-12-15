import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as url from "url";

import * as Express from "express";
import * as minimist from "minimist";

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

function readManifest(bundle: string) {
  const manifestPath = path.join(bundle, "manifest.json");
  const rawManifest = fs.readFileSync(manifestPath, { encoding: "utf8" })
  return JSON.parse(rawManifest) as ClientManifest;
}

function buildApplication(assetsMountPath: string, bundle: string, keepAlive: boolean): Express.Application {
  const manifest = readManifest(bundle);

  const app = Express();

  app.set("case sensitive routing", false);
  app.set("strict routing", false);
  app.set("x-powered-by", false);

  const connectionHeaderValue = keepAlive ? "keep-alive" : "close";
  app.use((req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
    res.setHeader("Connection", connectionHeaderValue);
    next();
  });

  app.use(assetsMountPath, Express.static(path.join(bundle, manifest.publicDirectoryPath)));

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

type ServerStarter = (app: Express.Application, port: number, socketTimeout: number) => Promise<ServerListeningState>;

const startServer: ServerStarter = async (app: Express.Application, port: number, socketTimeout: number): Promise<ServerListeningState> => {
  const wrapperApp = Express();

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

async function listenForProcessInteruptSignal(_process: NodeJS.Process): Promise<string> {
  return new Promise<string>((resolve) => {
    _process.on("SIGINT", () => resolve("SIGINT"));
  });
}

async function listenForProcessTerminateSignal(_process: NodeJS.Process): Promise<string> {
  return new Promise<string>((resolve) => {
    _process.on("SIGTERM", () => resolve("SIGINT"));
  });
}

async function startAndSafelyShutdownOnProcessSignal(_process: NodeJS.Process, app: Express.Application, port: number, socketTimeout: number, startServer: ServerStarter): Promise<void> {
  const serverListeningState = await startServer(app, port, socketTimeout);

  console.log(`Server started; Port=${port} PID=${process.pid}`);

  const receivedSignal = await Promise.race([
    listenForProcessInteruptSignal(_process),
    listenForProcessTerminateSignal(_process)
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

export type ServerConfig = {
  assetsMountPath: string; // "/assets/",
  bundlePath: string; // "/path/to/bundle/directory"
  keepAlive: boolean; // Enable HTTP Persistent Connections
  port: number;
  socketTimeout: number;
}

export function parseArgs(args: string[]): ServerConfig {
  const parsedArgs = minimist(args);

  return {
    assetsMountPath: "/",
    bundlePath: parsedArgs["bundle"],
    port: parseInt(parsedArgs["port"], 10),
    keepAlive: false,
    socketTimeout: parseInt(parsedArgs["socketTimeout"], 10),
  }
}

export async function run(_process: NodeJS.Process, config: ServerConfig): Promise<void> {
  const app = buildApplication(config.assetsMountPath, config.bundlePath, config.keepAlive);
  await startAndSafelyShutdownOnProcessSignal(_process, app, config.port, config.socketTimeout, startServer);
}

export async function main(args: string[]): Promise<number> {
  try {
    const config = parseArgs(args);
    await run(process, config);
    return 0;
  } catch(e) {
    console.error(e);
    return 1;
  }
}
