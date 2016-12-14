import * as path from "path";
import * as webpack from "webpack";

const root = path.join(__dirname, "..");

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
    new webpack.optimize.UglifyJsPlugin({compress: { warnings: false }})
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
      { test: /\.tsx?$/, loader: "ts-loader" }
    ]
  },
  output: {
    filename: "application-[hash].js",
    path: path.join(root, "out", "bundle"),
    library: "application",
    libraryTarget: "this",
  },
  ts: {
    configFileName: require.resolve("./tsconfig.client.json"),
    logInfoToStdOut: true,
    logLevel: "error"
  }
};

