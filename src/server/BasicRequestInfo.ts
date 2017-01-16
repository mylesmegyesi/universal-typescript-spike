import * as url from "url";

export type BasicRequestInfo = {
  protocol: string;
  headers: { [key: string]: string };
  baseUrl: string;
}

