
declare module "webpack-dev-middleware" {
	import * as webpack from "webpack";
	import * as express from "express";

  namespace WebpackDevMiddleware {
    export interface Configuration {
      watchOptions?: { aggregateTimeout?: number; };
      watchDelay?: number;
      stats?: { context?: string; };
      lazy?: boolean;
      filename?: string|RegExp;
      quiet?: boolean;
      noInfo?: boolean;
      publicPath?: string;
      headers?: {};
    }

    export interface WebpackDevMiddleware {
      new (
        webpack: webpack.compiler.Compiler,
        config: Configuration
      ): express.RequestHandler;

    }
  }

  var wdm: WebpackDevMiddleware.WebpackDevMiddleware;

  export = wds;
}
