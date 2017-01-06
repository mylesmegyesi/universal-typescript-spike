import * as path from "path";
import * as ExtractTextPlugin from "extract-text-webpack-plugin";
import * as Express from "express";
import { buildOriginClientAssetBaseUrl } from "../src/server/Main";
import { buildApplicationWebPageMiddleware } from "../src/server/ApplicationWebPage";

const root = path.join(__dirname, "..");

const CLIENT_MAIN_SCRIPT_BASE_NAME = "application";
const CLIENT_MAIN_MODULE_NAME = "application";
const ASSETS_MOUNT_PATH = "/";

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
      { test: /\.tsx?$/, loader: "ts-loader" },
      { test: /\.scss$/,
        loader: (ExtractTextPlugin as any).extract('style-loader?sourceMap', 'css-loader?sourceMap!sass-loader?sourceMap')
      },
      { test: /\.(png|woff|woff2|eot|ttf|svg)$/, loader: 'url-loader?limit=100000' }
    ]
  },
  plugins: [
    new ExtractTextPlugin("application-[contenthash].css"),
  ],
  output: {
    filename: `${CLIENT_MAIN_SCRIPT_BASE_NAME}-[hash].js`,
    library: CLIENT_MAIN_MODULE_NAME,
    libraryTarget: "this",
  },
  sassLoader: {
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
    cache: false,
    stats: "minimal",
    inline: false,
    publicPath: ASSETS_MOUNT_PATH,
    setup: (app: Express.Application, devServer: any) => {
      function bundleReady(): Promise<any> {
        return new Promise((resolve) => {
          devServer.middleware.waitUntilValid(resolve);
        });
      }

      function getCompiledMainScriptName(compilation: any): string {
        const foundMainScript = Object.keys(compilation.assets).find((filename) => {
          return filename.startsWith(CLIENT_MAIN_SCRIPT_BASE_NAME) && path.extname(filename) === ".js";
        });

        if (!foundMainScript) {
          throw new Error(`Could not find client main script ("${CLIENT_MAIN_SCRIPT_BASE_NAME}") in Webpack compilation result`);
        }

        return foundMainScript;
      }

      function getCompiledCssName(compilation: any): string {
        const foundCss = Object.keys(compilation.assets).find((filename) => {
          return filename.startsWith(CLIENT_MAIN_SCRIPT_BASE_NAME) && path.extname(filename) === ".css";
        });

        if (!foundCss) {
          throw new Error(`Could not find client css ("${CLIENT_MAIN_SCRIPT_BASE_NAME}") in Webpack compilation result`);
        }

        return foundCss;
      }

      function buildWebPageMiddlewareOptions(compilation: any) {
        return {
          mainScriptName: getCompiledMainScriptName(compilation),
          mainCssName: getCompiledCssName(compilation),
          clientMainModuleName: CLIENT_MAIN_MODULE_NAME,
          clientAssetsBaseUrl: (req: Express.Request) => buildOriginClientAssetBaseUrl(req, ASSETS_MOUNT_PATH),
        };
      }

      app.get("/", async (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
        const webpackStats = await bundleReady();
        const middlewareOptions = buildWebPageMiddlewareOptions(webpackStats.compilation);
        const middleware = buildApplicationWebPageMiddleware(middlewareOptions);
        middleware(req, res, next);
      });
    },
  },
};
