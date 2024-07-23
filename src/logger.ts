import debug from "debug";

class Logger {
  private baseNamespace: string;

  constructor(baseNamespace: string) {
    this.baseNamespace = baseNamespace;
  }

  info(...messages: any[]) {
    console.log(`${this.baseNamespace}:info ` + messages);
  }

  warn(...messages: any[]) {
    console.log(`${this.baseNamespace}:warn ` + messages);
  }

  error(...messages: any[]) {
    debug(`${this.baseNamespace}:error ` + messages);
  }
}

export default Logger;
