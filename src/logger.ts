import debug from "debug";

import { Axiom } from "@axiomhq/js";

if (!process.env.AXIOM_API_TOKEN) {
  throw new Error("AXIOM_API_TOKEN environment variable is required");
}
const axiom = new Axiom({ token: process.env.AXIOM_API_TOKEN });

const AXIOM_DATASET = "musegpt";
axiom.ingest(AXIOM_DATASET, [{ module: "discorder", info: "logger started" }]);
await axiom.flush();

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
    if (this.enabled) {
      const msg = `${this.baseNamespace}:info ` + messages;
      console.info(msg);
      axiom.ingest(AXIOM_DATASET, [{ module: "discorder", info: msg }]);
    }
  }

  warn(...messages: any[]) {
    if (this.enabled) {
      const msg = `${this.baseNamespace}:warn ` + messages;
      console.warn(msg);
      axiom.ingest(AXIOM_DATASET, [{ module: "discorder", warning: msg }]);
      axiom.flush();
    }
  }

  error(...messages: any[]) {
    const msg = `${this.baseNamespace}:error ` + messages;
    debug(msg);
    axiom.ingest(AXIOM_DATASET, [{ module: "discorder", error: msg }]);
    axiom.flush();
  }
}

export default Logger;
