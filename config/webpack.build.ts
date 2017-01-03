import * as path from "path";
import * as webpack from "webpack";
import * as ExtractTextPlugin from "extract-text-webpack-plugin";
import { ClientManifest } from "../src/server/Main";

const root = path.join(__dirname, "..");

const CLIENT_MAIN_SCRIPT_BASE_NAME = "application";
const CLIENT_MAIN_MODULE_NAME = "application";

class ManifestPlugin {
  private publicDirectoryPath: string = "public";

  public apply(compiler: any) {
    compiler.plugin("emit", (compilation: any, done: () => void) => {
      const mainScriptName = Object.keys(compilation.assets).find((filename) => {
        return filename.startsWith(CLIENT_MAIN_SCRIPT_BASE_NAME) && path.extname(filename) === ".js";
      });

      if (!mainScriptName) {
        throw new Error(`Could not find main script: ${CLIENT_MAIN_SCRIPT_BASE_NAME}`);
      }

      const mainCssName = Object.keys(compilation.assets).find((filename) => {
        return filename.startsWith(CLIENT_MAIN_SCRIPT_BASE_NAME) && path.extname(filename) === ".css";
      });

      if (!mainCssName) {
        throw new Error(`Could not find main css: ${CLIENT_MAIN_SCRIPT_BASE_NAME}`);
      }


      const manifest: ClientManifest = {
        mainScriptName: mainScriptName,
        mainCssName: mainCssName,
        clientMainModuleName: CLIENT_MAIN_MODULE_NAME,
        publicDirectoryPath: this.publicDirectoryPath,
      }
      const replacer = null;
      const prettyPrint = 2;
      const manifestJson = JSON.stringify(manifest, replacer, prettyPrint);

      Object.keys(compilation.assets).forEach((filename) => {
        const newFilePath = path.join(this.publicDirectoryPath, filename);
        const fileContents = compilation.assets[filename];
        compilation.assets[newFilePath] = fileContents;
        delete compilation.assets[filename];
      });

      compilation.assets["manifest.json"] = {
        source: () => manifestJson,
          size: () => manifestJson.length
      };

      done();
    })
  }
}

module.exports = {
  entry: path.join(root, "src", "client", "Main.ts"),
  debug: false,
  bail: false,
  devtool: "source-map",
  plugins: [
    new webpack.DefinePlugin({
      "process.env": {
        // This has effect on the react lib size
        "NODE_ENV": JSON.stringify("production")
      }
    }),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.OccurrenceOrderPlugin(true),
    new webpack.optimize.UglifyJsPlugin({compress: { warnings: false }}),
    new ExtractTextPlugin("application-[contenthash].css"),
    new ManifestPlugin()
  ],
  resolve: {
    root: root,
    extensions: ["", ".ts", ".tsx", ".js"],
    // alias: {
    //   "react": "react/dist/react.js",
    //   "react-dom$": "react-dom/dist/react-dom.js",
    // }
  },
  module: {
    loaders: [
      { test: /\.tsx?$/, loader: "ts-loader" },
      { test: /\.scss$/,
        loader: (ExtractTextPlugin as any).extract('style-loader?sourceMap', 'css-loader?sourceMap!sass-loader?sourceMap')
      },
      { test: /\.(png|woff|woff2|eot|ttf|svg)$/, loader: 'url-loader?limit=100000' }
    ],
  },
  sassLoader: {
  },
  output: {
    filename: `${CLIENT_MAIN_SCRIPT_BASE_NAME}-[hash].js`,
    library: CLIENT_MAIN_MODULE_NAME,
    libraryTarget: "this",
  },
  ts: {
    configFileName: require.resolve("./tsconfig.client.json"),
    logInfoToStdOut: true,
    logLevel: "error"
  }
};
