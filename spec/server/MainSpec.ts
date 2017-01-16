import { expect } from "chai";

import { isUsageError, parseCommandLineArgs } from "../../src/server/Main";

describe("Main", () => {
  context("parseCommandLineArgs", () => {
    const validArgs: { [key: string]: string } = {
      "--port": "8080",
      "--bundlePath": "/path/to/bundle",
    };

    function flatten(args: { [key: string]: string }): string[] {
      const flatArgs: string[] = [];
      for (const prop in args) {
        if (args.hasOwnProperty(prop)) {
          flatArgs.push(prop);
          flatArgs.push(args[prop]);
        }
      }

      return flatArgs;
    }

    it(`parses port`, () => {
      const args = { ...validArgs, "--port": "9090" };

      const result = parseCommandLineArgs(flatten(args));

      if (isUsageError(result)) {
        expect("<success>").to.eql(result);
      } else {
        expect(result.port).to.eql(9090);
      }
    });

    it(`defaults when port is missing`, () => {
      const { "--port": _, ...args } = validArgs;

      const result = parseCommandLineArgs(flatten(args));

      if (isUsageError(result)) {
        expect("<success>").to.eql(result);
      } else {
        expect(result.port).to.eql(8080);
      }
    });

    it(`fails when port is not a number`, () => {
      const args = { ...validArgs, "--port": "not a number" };

      const result = parseCommandLineArgs(flatten(args));

      expect(isUsageError(result)).to.be.true;
    });

    it(`parses bundlePath`, () => {
      const args = { ...validArgs, "--bundlePath": "/new/path/to/bundle" };

      const result = parseCommandLineArgs(flatten(args));

      if (isUsageError(result)) {
        expect("<success>").to.eql(result);
      } else {
        expect(result.bundlePath).to.eql("/new/path/to/bundle");
      }
    });
  });
});
