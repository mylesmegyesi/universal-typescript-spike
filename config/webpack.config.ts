import * as path from "path";
import * as webpack from "webpack";
import * as ExtractTextPlugin from "extract-text-webpack-plugin";
import { ClientManifest, MANIFEST_FILE_NAME } from "../src/server/ClientManifest";

const root = path.join(__dirname, "..");

const CLIENT_MAIN_SCRIPT_BASE_NAME = "application";
const CLIENT_MAIN_MODULE_NAME = "application";

class ManifestPlugin {
  constructor(private publicDirectoryPath: string) {}

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
        scriptOnLoadCallback: `window["${CLIENT_MAIN_MODULE_NAME}"]`,
        publicDirectoryPath: this.publicDirectoryPath,
      }
      const replacer = null;
      const prettyPrint = 2;
      const manifestJson = JSON.stringify(manifest, replacer, prettyPrint);

      Object.keys(compilation.assets).forEach((filename) => {
        const newFilePath = path.join(this.publicDirectoryPath, filename);
        const fileContents = compilation.assets[filename];
        delete compilation.assets[filename];
        compilation.assets[newFilePath] = fileContents;
      });

      compilation.assets[MANIFEST_FILE_NAME] = {
        source: () => manifestJson,
          size: () => manifestJson.length
      };

      done();
    })
  }
}

const env = process.env["NODE_ENV"] || "development";

function buildFileName(name: string, ext: string) {
  if (env === "development") {
    return `${name}.${ext}`;
  }

  return `${name}-[hash].${ext}`;
}

function buildPluginList() {
  const plugins = [
    new webpack.DefinePlugin({
      "process.env": {
        // This has effect on the react lib size
        "NODE_ENV": JSON.stringify(env)
      }
    }),
  ];

  if (env === "production") {
    plugins.push(new webpack.optimize.DedupePlugin());
    plugins.push(new webpack.optimize.OccurrenceOrderPlugin(true));
    plugins.push(new webpack.optimize.UglifyJsPlugin({compress: { warnings: false }}));
  }

  plugins.push(new ExtractTextPlugin(buildFileName("application", "css")))
  plugins.push(new ManifestPlugin(env === "development" ? "" : "public"))

  return plugins;
}

module.exports = {
  entry: path.join(root, "src", "client", "Main.ts"),
  debug: false,
  bail: false,
  devtool: "source-map",
  plugins: buildPluginList(),
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
      {
        test: /\.(png|woff|woff2|eot|ttf|svg)$/,
        loader: `url-loader?limit=100000&name=${buildFileName("[name]", "[ext]")}`,
      }
    ],
  },
  output: {
    filename: buildFileName(CLIENT_MAIN_SCRIPT_BASE_NAME, "js"),
    library: CLIENT_MAIN_MODULE_NAME,
    libraryTarget: "this",
  },
  ts: {
    configFileName: require.resolve("./tsconfig.client.json"),
    logInfoToStdOut: true,
    logLevel: "error"
  }
};

