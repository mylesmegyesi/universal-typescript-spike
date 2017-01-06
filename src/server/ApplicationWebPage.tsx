import * as Express from "express";
import * as React from "react";
import { renderToString, renderToStaticMarkup } from "react-dom/server";

import { Application, ApplicationProps } from "../common/Application";
import { ClientConfig } from "../common/ClientConfig";

export type ApplicationWebPageProps = {
  baseUrl: string;
  title: string;
  clientCssSrc: string,
  clientScriptTagSrc: string;
  clientScriptTagOnLoadCallback: string;
  applicationContainerId: string;
  applicationProps: ApplicationProps;
}

export const ApplicationWebPage = (props: ApplicationWebPageProps) =>
  <html>
    <head>
      <base href={props.baseUrl} target="_self" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <title>{props.title}</title>
      <link rel="stylesheet" type="text/css" href={props.clientCssSrc} />
    </head>
    <body>
      <div id={props.applicationContainerId}
           dangerouslySetInnerHTML={{__html: renderToString(<Application {...props.applicationProps} />)}} />
      <div dangerouslySetInnerHTML={{__html: `<script type="text/javascript" src="${props.clientScriptTagSrc}" onload='${props.clientScriptTagOnLoadCallback}'></script>` }} />
    </body>
  </html>;

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

