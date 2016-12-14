import * as path from "path";
import * as webpack from "webpack";
import * as Express from "express";
import { configureApplication } from "../src/server/Main";

const root = path.join(__dirname, "..");

const devServerConfig = {
  hot: false,
  historyApiFallback: false,
  compress: false,
  clientLogLevel: "info",
  quiet: false,
  noInfo: false,
  lazy: false,
  stats: "minimal",
  inline: true,
  setup: configureApplication,
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
  output: {
    filename: "application.js",
    library: "application",
    libraryTarget: "this",
  },
  ts: {
    configFileName: require.resolve("./tsconfig.client.json"),
    logInfoToStdOut: true,
    logLevel: "error"
  },
  devServer: devServerConfig,
};

