import * as path from "path";
import * as url from "url";
import * as webpack from "webpack";
import * as Express from "express";
import { buildOriginClientAssetBaseUrl } from "../src/server/Main";
import { buildApplicationWebPageMiddleware } from "../src/server/ApplicationWebPageMiddleware";

const root = path.join(__dirname, "..");

const CLIENT_MAIN_SCRIPT_BASE_NAME = "application";
const CLIENT_MAIN_MODULE_NAME = "application";
const ASSETS_MOUNT_PATH = "/";

class CompilationInspectorPlugin {
  public compilation: any | null = null;

  public apply(compiler: any) {
    compiler.plugin("emit", (compilation: any, done: () => void) => {
      this.compilation = compilation;
      done();
    })
  }
}
const compilationInspectorPlugin = new CompilationInspectorPlugin();

function setImmediateAsync<T>(fn: () => PromiseLike<T> | T): Promise<T> {
  return new Promise((resolve) => setImmediate(() => resolve(fn())));
}

async function getCompilationResult(): Promise<string> {
  if (!compilationInspectorPlugin.compilation) {
    return await setImmediateAsync(() => getCompilationResult());
  }

  return compilationInspectorPlugin.compilation;
}

async function getCompiledMainScriptName(): Promise<string> {
  const compilation = await getCompilationResult();

  const foundMainScript = Object.keys(compilationInspectorPlugin.compilation.assets).find((filename) => {
    return filename.startsWith(CLIENT_MAIN_SCRIPT_BASE_NAME) && path.extname(filename) === ".js";
  });

  if (!foundMainScript) {
    throw new Error(`Could not find client main script ("${CLIENT_MAIN_SCRIPT_BASE_NAME}") in Webpack compilation result`);
  }

  return foundMainScript;
}

module.exports = {
  entry: path.join(root, "src", "client", "Main.ts"),
  debug: true,
  bail: false,
  devtool: "source-map",
  resolve: {
    root: root,
    extensions: ["", ".ts", ".tsx", ".js"],
  },
  module: {
    loaders: [
      { test: /\.tsx?$/, loader: "ts-loader" }
    ]
  },
  plugins: [
    compilationInspectorPlugin,
  ],
  output: {
    filename: `${CLIENT_MAIN_SCRIPT_BASE_NAME}-[hash].js`,
    library: CLIENT_MAIN_MODULE_NAME,
    libraryTarget: "this",
  },
  ts: {
    configFileName: require.resolve("./tsconfig.client.json"),
    logInfoToStdOut: true,
    logLevel: "error"
  },
  devServer: {
    hot: false,
    historyApiFallback: false,
    compress: false,
    clientLogLevel: "info",
    quiet: false,
    noInfo: false,
    lazy: false,
    stats: "minimal",
    inline: false,
    publicPath: ASSETS_MOUNT_PATH,
    setup: (app: Express.Application) => {
      app.get("/", buildApplicationWebPageMiddleware({
        mainScriptName: getCompiledMainScriptName,
        clientMainModuleName: CLIENT_MAIN_MODULE_NAME,
        clientAssetsBaseUrl: (_req) => buildOriginClientAssetBaseUrl(_req, ASSETS_MOUNT_PATH),
      }));
    },
  },
};

