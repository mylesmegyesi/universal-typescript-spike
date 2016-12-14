import { createElement } from "react";
import { render } from "react-dom";

import { Application } from "./Application";
import { ClientConfig } from "./ClientConfig";

export function main(config: ClientConfig) {
  render(
    createElement(Application, config.applicationProps),
    document.getElementById(config.applicationContainerId)
  );
}

