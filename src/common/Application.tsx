import { setInterval } from "timers";

import * as React from "react";

export type ApplicationProps = {
  pageTitle: string;
  postfix: string;
  count: number;
}

export class Application extends React.Component<ApplicationProps, ApplicationProps> {
  private timer: NodeJS.Timer | null = null;

  public constructor(props: ApplicationProps) {
    super(props);
    this.state = props;
  }

  public componentDidMount(): void {
    this.timer = setInterval(() => {
      this.setState({...this.state, count: this.state.count + 1});
    }, 1000);
  }

  public componentWillUnmount(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  public render(): JSX.Element {
    return <div><h1>Hello, {this.state.postfix}! (Tick: {this.state.count})</h1><p>Hello, {this.state.postfix}! <em>(Tick: {this.state.count})</em></p></div>;
  }
}
