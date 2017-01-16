import * as Express from "express";
import * as React from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";

import { Application, ApplicationProps } from "../common/Application";
import { ClientConfig } from "../common/ClientConfig";
import { BasicRequestInfo } from "./BasicRequestInfo";
import { ClientManifest } from "./ClientManifest";

export type ApplicationWebPageProps = {
  baseUrl: string;
  manifest: ClientManifest;
  applicationProps: ApplicationProps;
}

const APPLICATION_CONTAINER_ID = "app-root";

export const ApplicationWebPage = (props: ApplicationWebPageProps) => {
  const clientConfig: ClientConfig = {
    applicationContainerId: APPLICATION_CONTAINER_ID,
    applicationProps: props.applicationProps,
  };
  const scriptOnLoadCallback = `${props.manifest.scriptOnLoadCallback}(${JSON.stringify(clientConfig)})`;

  return <html>
    <head>
      <base href={props.baseUrl} target="_self" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <title>{props.applicationProps.pageTitle}</title>
      <link rel="stylesheet" type="text/css" href={props.manifest.mainCssName} />
    </head>
    <body>
      <div id={APPLICATION_CONTAINER_ID}
           dangerouslySetInnerHTML={{__html: renderToString(<Application {...props.applicationProps} />)}} />
      <div dangerouslySetInnerHTML={{__html: `<script type="text/javascript" src="${props.manifest.mainScriptName}" onload='${scriptOnLoadCallback}'></script>` }} />
    </body>
  </html>;
};

export type ApplicationWebPageMiddlewareConfig = {
  manifest: ClientManifest;
  clientAssetsBaseUrl: (req: BasicRequestInfo) => string;
}

const applicationProps: ApplicationProps = {
  pageTitle: "Page Title",
  postfix: "World",
  count: 100,
};

export function buildApplicationWebPageMiddleware(config: ApplicationWebPageMiddlewareConfig): Express.Handler {
  return async (request: Express.Request, response: Express.Response, next: Express.NextFunction) => {
    response.set("Content-Type", "text/html; charset=utf-8");
    const webPageElement = React.createElement(ApplicationWebPage, {
      baseUrl: config.clientAssetsBaseUrl(request),
      manifest: config.manifest,
      applicationProps: applicationProps,
    });
    response.send(`<!DOCTYPE html>${renderToStaticMarkup(webPageElement)}`);
  };
}
