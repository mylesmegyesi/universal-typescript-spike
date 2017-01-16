import { createElement } from "react";
import { render } from "react-dom";

import { Application } from "../common/Application";
import { ClientConfig } from "../common/ClientConfig";

require("./stylesheets/main.scss");

function main(config: ClientConfig): void {
  render(
    createElement(Application, config.applicationProps),
    document.getElementById(config.applicationContainerId),
  );
}

module.exports = main;
