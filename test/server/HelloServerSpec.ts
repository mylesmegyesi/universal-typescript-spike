import { expect } from "chai";
import { Greeter } from "../../src/server/Hello";

describe("server things", () => {
  it("greets", () => {
    const greeter = new Greeter("World");
    expect(greeter.greet()).to.eql("Hello, World!");
  });
});
