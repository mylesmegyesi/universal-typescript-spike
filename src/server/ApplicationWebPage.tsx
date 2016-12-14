import * as React from "react";
import { renderToString } from "react-dom/server";

import { Application, ApplicationProps } from "../client/Application";

export type ApplicationWebPageProps = {
  title: string;
  clientScriptTagSrc: string;
  clientScriptTagOnLoadCallback: string;
  applicationContainerId: string;
  applicationProps: ApplicationProps;
}

export const ApplicationWebPage = (props: ApplicationWebPageProps) =>
  <html>
    <head>
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" ></meta>
      <title>{props.title}</title>
    </head>
    <body>
      <div id={props.applicationContainerId}
           dangerouslySetInnerHTML={{__html: renderToString(<Application {...props.applicationProps} />)}} />
      <div dangerouslySetInnerHTML={{__html: `<script type="text/javascript" src="${props.clientScriptTagSrc}" onload='${props.clientScriptTagOnLoadCallback}'></script>` }} />
    </body>
  </html>;
