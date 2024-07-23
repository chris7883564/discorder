import debug from "debug";

class Logger {
  private baseNamespace: string;

  constructor(baseNamespace: string) {
    this.baseNamespace = baseNamespace;
  }

  info(...messages: any[]) {
    const logInfo = debug(`${this.baseNamespace}:info`);
    logInfo(messages);
  }

  warn(...messages: any[]) {
    const logWarn = debug(`${this.baseNamespace}:warn`);
    logWarn(messages);
  }

  error(...messages: any[]) {
    const logError = debug(`${this.baseNamespace}:error`);
    logError(messages);
  }
}

export default Logger;
