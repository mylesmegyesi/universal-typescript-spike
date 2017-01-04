import * as Express from "express";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ApplicationWebPage, ApplicationWebPageProps } from "./ApplicationWebPage";
import { ClientConfig } from "../common/ClientConfig";
import { Application, ApplicationProps } from "../common/Application";

export type ApplicationWebPageMiddlewareConfig = {
  mainScriptName: () => Promise<string>;
  mainCssName: () => Promise<string>;
  clientMainModuleName: string;
  clientAssetsBaseUrl: (req: Express.Request) => string;
}

export function buildApplicationWebPageMiddleware(config: ApplicationWebPageMiddlewareConfig): Express.Handler {
  return async (request: Express.Request, response: Express.Response, next: Express.NextFunction) => {
    response.set("Content-Type", "text/html; charset=utf-8");

    const applicationProps: ApplicationProps = {
      postfix: "World",
      count: 1001,
    };

    const clientConfig: ClientConfig = {
      applicationContainerId: "app-root",
      applicationProps: applicationProps,
    };

    const applicationWebPageProps: ApplicationWebPageProps = {
      title: "Page Title",
      baseUrl: config.clientAssetsBaseUrl(request),
      clientCssSrc: await config.mainCssName(),
      clientScriptTagSrc: await config.mainScriptName(),
      clientScriptTagOnLoadCallback: `window[\"${config.clientMainModuleName}\"][\"main\"](${JSON.stringify(clientConfig)})`,
      applicationContainerId: clientConfig.applicationContainerId,
      applicationProps: applicationProps,
    };

    const webPageElement = React.createElement(ApplicationWebPage, applicationWebPageProps);
    response.send(`<!DOCTYPE html>${renderToStaticMarkup(webPageElement)}`);
  };
}

