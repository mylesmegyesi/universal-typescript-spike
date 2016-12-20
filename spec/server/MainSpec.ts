import { expect, assert } from "chai";
import { parseArgs, isParseArgsResultFail, isParseArgsResultSuccess } from "../../src/server/Main";

describe("Main", () => {
  context("parseArgs", () => {
    const validArgs: { [key: string]: string } = {
      "--socketTimeout": "10000",
      "--port": "8080",
      "--bundlePath": "/path/to/bundle",
    };

    function flatten(args: { [key: string]: string }) {
      const flatArgs = [];
      for(const prop in args) {
        flatArgs.push(prop);
        flatArgs.push(args[prop]);
      }

      return flatArgs;
    }

    it(`parses socketTimeout`, () => {
      const args = { ...validArgs, "--socketTimeout": "1000" };

      const result = parseArgs(flatten(args));

      if (isParseArgsResultSuccess(result)) {
        expect(result.socketTimeout).to.eql(1000);
      } else {
        expect("<success>").to.eql(result);
      }
    });

    it(`fails when socketTimeout is missing`, () => {
      const { "--socketTimeout": _, ...args } = validArgs;

      const result = parseArgs(flatten(args));

      expect(isParseArgsResultFail(result)).to.be.true;
    });

    it(`fails when socketTimeout is not a number`, () => {
      const args = { ...validArgs, "--socketTimeout": "not a number" };

      const result = parseArgs(flatten(args));

      expect(isParseArgsResultFail(result)).to.be.true;
    });

    it(`parses port`, () => {
      const args = { ...validArgs, "--port": "9090" };

      const result = parseArgs(flatten(args));

      if (isParseArgsResultSuccess(result)) {
        expect(result.port).to.eql(9090);
      } else {
        expect("<success>").to.eql(result);
      }
    });

    it(`fails when port is missing`, () => {
      const { "--port": _, ...args } = validArgs;

      const result = parseArgs(flatten(args));

      expect(isParseArgsResultFail(result)).to.be.true;
    });

    it(`fails when port is not a number`, () => {
      const args = { ...validArgs, "--port": "not a number" };

      const result = parseArgs(flatten(args));

      expect(isParseArgsResultFail(result)).to.be.true;
    });

    it(`parses keepAlive`, () => {
      const args = flatten(validArgs).concat(["--keepAlive"])

      const result = parseArgs(args);

      if (isParseArgsResultSuccess(result)) {
        expect(result.keepAlive).to.be.true;
      } else {
        expect("<success>").to.eql(result);
      }
    });

    it(`defaults keepAlive to false when not specified`, () => {
      const { "--keepAlive": _, ...args } = validArgs;

      const result = parseArgs(flatten(args));

      if (isParseArgsResultSuccess(result)) {
        expect(result.keepAlive).to.be.false;
      } else {
        expect("<success>").to.eql(result);
      }
    });

    it(`parses bundlePath`, () => {
      const args = { ...validArgs, "--bundlePath": "/new/path/to/bundle" };

      const result = parseArgs(flatten(args));

      if (isParseArgsResultSuccess(result)) {
        expect(result.bundlePath).to.eql("/new/path/to/bundle");
      } else {
        expect("<success>").to.eql(result);
      }
    });
  });
});
