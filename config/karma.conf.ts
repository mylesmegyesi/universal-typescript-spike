import * as path from "path";

const root = path.join(__dirname, "..")

type KarmaConfigOptions = {
  logLevel: string;
}
type KarmaConfig = KarmaConfigOptions & {
  set: (config: any) => void;
}

module.exports = (config: KarmaConfig) => {
  const logLevel = "error";
  config.set({
    basePath: root,
    failOnEmptyTestSuite: true,
    browsers: ["PhantomJS"],
    logLevel: logLevel,
    files: [
      "spec/client/**/*Spec.ts",
      "spec/client/**/*Spec.tsx",
      "spec/common/**/*Spec.ts",
      "spec/common/**/*Spec.tsx"
    ],
    frameworks: ["mocha"],
    preprocessors: {
      "**/*.ts": ["webpack", "sourcemap"],
      "**/*.tsx": ["webpack", "sourcemap"]
    },
    reporters: ["mocha"],
    mochaReporter: {
      showDiff: true,
      output: "minimal",
    },
    webpackMiddleware: { noInfo: true },
    webpack: {
      debug: true,
      bail: true,
      devtool: "source-map",
      resolve: {
        extensions: ["", ".ts", ".tsx", ".js"]
      },
      module: {
        loaders: [
          { test: /\.tsx?$/, loader: "ts-loader" }
        ]
      },
      ts: {
        configFileName: require.resolve("./tsconfig.client.test.json"),
        logInfoToStdOut: true,
        logLevel: logLevel.toLowerCase()
      }
    }
  });
}

