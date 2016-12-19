import * as React from "react";
import { renderToString } from "react-dom/server";

import { Application, ApplicationProps } from "../client/Application";

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
