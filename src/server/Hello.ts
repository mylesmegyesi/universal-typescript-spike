export class Greeter {
  constructor(private postfix: string) { }

  public greet(): string {
    return `Hello, ${this.postfix}!`;
  }
}

