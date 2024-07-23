import debug from "debug";

class Logger {
  private baseNamespace: string;

  constructor(baseNamespace: string) {
    this.baseNamespace = baseNamespace;
  }

  info(...messages: any[]) {
    const log_record = {
      time: new Date().toISOString(),
      level: "info",
      message: `${this.baseNamespace}:info ` + messages.join(" "),
    };
    console.log(`${this.baseNamespace}:info` + messages);
    console.log(log_record);
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
