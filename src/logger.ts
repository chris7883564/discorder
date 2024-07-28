import debug from "debug";

class Logger {
  private baseNamespace: string;
  private enabled: boolean = true;

  constructor(baseNamespace: string) {
    this.baseNamespace = baseNamespace;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  info(...messages: any[]) {
    if (this.enabled) console.log(`${this.baseNamespace}:info ` + messages);
  }

  warn(...messages: any[]) {
    if (this.enabled) console.warn(`${this.baseNamespace}:warn ` + messages);
  }

  error(...messages: any[]) {
    debug(`${this.baseNamespace}:error ` + messages);
  }
}

export default Logger;
