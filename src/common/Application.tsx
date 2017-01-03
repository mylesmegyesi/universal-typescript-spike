import { setInterval } from "timers";
import * as React from "react";

export type ApplicationProps = {
  postfix: string;
  count: number;
}

export class Application extends React.Component<ApplicationProps, ApplicationProps> {
  private timer: NodeJS.Timer | null = null;

  constructor(props: ApplicationProps) {
    super(props);
    this.state = props;
  }

  componentDidMount() {
    this.timer = setInterval(() => {
      this.setState({...this.state, count: this.state.count + 1});
    }, 1000);
  }

  componentWillUnmount() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  public render() {
    return <div><h1>Hello, {this.state.postfix}! (Tick: {this.state.count})</h1><p>Hello, {this.state.postfix}! <em>(Tick: {this.state.count})</em></p></div>;
  }
}
