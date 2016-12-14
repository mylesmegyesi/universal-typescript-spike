import * as http from "http";

import * as Express from "express";
import * as React from "react";
import { renderToString, renderToStaticMarkup } from "react-dom/server";

import { Application, ApplicationProps } from "../client/Application";
import { ClientConfig } from "../client/ClientConfig";
import { ApplicationWebPage, ApplicationWebPageProps } from "./ApplicationWebPage";

export function configureApplication(app: Express.Application): void {
  app.get("/", (_, response) => {
    response.set("Content-Type", "text/html; charset=utf-8");
    const applicationProps: ApplicationProps = {
      postfix: "World",
      count: 1001,
    };
    const clientConfig: ClientConfig = {
      applicationContainerId: "application-container",
      applicationProps: applicationProps,
    };
    const clientMainModuleName = "application";
    const clientConfigJson = JSON.stringify(clientConfig);
    const onloadCallback = `window[\"${clientMainModuleName}\"][\"main\"](${clientConfigJson})`;
    const applicationWebPageProps: ApplicationWebPageProps = {
      title: "Page Title",
      clientScriptTagSrc: "application.js",
      clientScriptTagOnLoadCallback: onloadCallback,
      applicationContainerId: clientConfig.applicationContainerId,
      applicationProps: applicationProps,
    };
    const webPageElement = React.createElement(ApplicationWebPage, applicationWebPageProps);
    response.send(`<!DOCTYPE html>${renderToStaticMarkup(webPageElement)}`);
  });
}

export function buildApplication(): Express.Application {
  const app = Express();
  configureApplication(app);
  return app;
}

type ShutdownResult = {
  closePromise: Promise<void>;
  numberOfOpenConnections: number;
}

function listen(app: Express.Application, port: number): Promise<() => Promise<ShutdownResult>> {
  return new Promise((resolveListenPromise) => {
    let server: http.Server;
    server = app.listen(port, () => {
      server.addListener("connection", (socket) => {
        socket.setKeepAlive(false);
      });

      const shutdownServer = () => {
        let closed = false;
        server.close(() => {
          closed = true;
        });
        const closePromise = new Promise((resolveClosePromise) => {
          if (closed) {
            resolveClosePromise();
          }
          server.on("close", () => {
            resolveClosePromise();
          });
        });

        return new Promise((resolveShutdownPromise, rejectShutdownPromise) => {
          server.getConnections((err, count) => {
            if (err) {
              rejectShutdownPromise(err);
            } else {
              resolveShutdownPromise({
                numberOfOpenConnections: count,
                closePromise: closePromise,
              });
            }
          });
        });
      };

      resolveListenPromise(shutdownServer);
    });
  });
}

async function run(port: number): Promise<void> {
  const app = buildApplication();
  const shutdown = await listen(app, port);

  console.log(`Server started; Port=${port} PID=${process.pid}`);

  let shuttingDownServer = false;

  const handleSignalAndSafeShutdown = (signal: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      process.on(signal, async () => {
        if (shuttingDownServer) {
          console.log(`Received ${signal}; shutdown already in progress`);
        } else {
          shuttingDownServer = true;
          const shutdownResult = await shutdown();
          if (shutdownResult.numberOfOpenConnections > 0) {
            console.log(`Received ${signal}; waiting for open ${shutdownResult.numberOfOpenConnections} connections to close before exiting`);
          } else {
            console.log(`Received ${signal}; shutting down server`);
          }
          await shutdownResult.closePromise;
          console.log("Server stopped; all requests complete and connections closed");
          resolve();
        }
      });
    });
  };

  return Promise.race([
    handleSignalAndSafeShutdown("SIGINT"),
    handleSignalAndSafeShutdown("SIGTERM")
  ]);
}

export async function main(args: string[]): Promise<number> {
  const port = parseInt(args[2], 10);
  try {
    await run(port);
    return 0;
  } catch(e) {
    console.error(e);
    return 1;
  }
}
