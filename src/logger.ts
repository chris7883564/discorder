import debug from "debug";
import { Axiom } from "@axiomhq/js";

if (!process.env.AXIOM_API_TOKEN) {
  throw new Error("AXIOM_API_TOKEN environment variable is required");
}

const axiom = new Axiom({ token: process.env.AXIOM_API_TOKEN });
const AXIOM_DATASET = "musegpt";

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

  private log(level: "info" | "warn" | "error", ...messages: any[]) {
    if (!this.enabled) return;

    const msg = messages.join(" ");
    const logEntry = {
      level,
      module: "discorder",
      function: this.baseNamespace,
      msg,
    };

    // Log to console
    if (level === "info") {
      console.info(msg);
    } else if (level === "warn") {
      console.warn(msg);
    } else if (level === "error") {
      debug(msg);
    }

    // Send to Axiom
    axiom.ingest(AXIOM_DATASET, [logEntry]);
    if (level !== "info") {
      axiom.flush();
    }
  }

  http(result: Response, ...messages: any[]) {
    const status = result.status;
    const statusText = result.statusText;

    if (status >= 200 && status < 300) {
      this.info(`${status} ${statusText}`, ...messages);
    } else if (status >= 300 && status < 400) {
      this.warn(`${status} redirection ${statusText}`, ...messages);
    } else if (status >= 400 && status < 500) {
      this.warn(`${status} client error ${statusText}`, ...messages);
    } else if (status >= 500) {
      this.error(`${status} server error ${statusText}`, ...messages);
    } else {
      this.info(`${status} ${statusText} `, ...messages);
    }
  }

  info(...messages: any[]) {
    this.log("info", ...messages);
  }

  warn(...messages: any[]) {
    this.log("warn", ...messages);
  }

  error(...messages: any[]) {
    this.log("error", ...messages);
  }
}

export default Logger;
