import * as os from "os";

import * as Express from "express";
import * as minimist from "minimist";
import * as webpack from "webpack";
import * as webpackDevMiddleware from "webpack-dev-middleware";

import { ClientManifest, MANIFEST_FILE_NAME, parseManifest } from "../src/server/ClientManifest";
import { run } from "../src/server/Main";
import _webpackConfig = require("./webpack.config");

const webpackConfig: any = _webpackConfig;
webpackConfig.debug = true;
webpackConfig.output.path = "/";

export type CommandLineArguments = {
  bundlePath: string;
  port: number;
}

export type CommandLineArgumentsParseResult = CommandLineArguments | string;

export function isUsageError(result: CommandLineArgumentsParseResult): result is string {
  return (typeof result === "string");
}

const usage = `
Options:
  --port        Port to listen on. Default 8080.
`;

export function parseCommandLineArgs(args: string[]): CommandLineArgumentsParseResult {
  let errorMessages: string[] = [];
  const parsedArgs = minimist(args, {
    string: ["port"],
    default: {
      port: "8080",
    },
    stopEarly: false,
    "--": false,
  });

  const validatedArguments: { [key: string]: any } = {};
  const rawPort = parsedArgs["port"];
  const parsedPort: number = parseInt(rawPort, 10);
  if (isNaN(parsedPort)) {
    errorMessages.push("--port must be an integer");
  } else {
    validatedArguments["port"] = parsedPort;
  }

  if (errorMessages.length > 0) {
    return `${errorMessages.join(os.EOL)}${os.EOL}${usage}`;
  }

  return validatedArguments as CommandLineArguments;
}

function getClientManifest(compilation: any): ClientManifest {
  return parseManifest(compilation.assets[MANIFEST_FILE_NAME].source());
}

async function buildClient(): Promise<[ClientManifest, Express.RequestHandler]> {
  const compiler = webpack(webpackConfig);
  const middlewareOptions: any = {
    hot: false,
    historyApiFallback: false,
    compress: false,
    clientLogLevel: "info",
    quiet: false,
    noInfo: false,
    lazy: false,
    cache: false,
    stats: "minimal",
    inline: false,
    publicPath: "/",
  };
  const middleware = webpackDevMiddleware(compiler, middlewareOptions);

  return new Promise<[ClientManifest, Express.RequestHandler]>((resolve, reject) => {
    middleware.waitUntilValid((stats: any) => {
      resolve([getClientManifest(stats.compilation), middleware]);
    });
  });
}

async function buildAndRun(commandLineArgs: CommandLineArguments): Promise<void> {
  const [manifest, assetsHandler] = await buildClient();
  await run({
    manifest: manifest,
    assetsHandler: assetsHandler,
    assetsMountPath: "/_assets/",
    https: false,
  }, commandLineArgs.port);
}

async function main(args: string[]): Promise<number> {
  try {
    const result = parseCommandLineArgs(args);
    if (isUsageError(result)) {
      console.error(result);
      return 1;
    } else {
      await buildAndRun(result);
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
