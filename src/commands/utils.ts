import debug from "debug";

const log = debug("bot:commands");
log.enabled = true;

//---------------------------------------------------------------------
// Show directory structure
import { exec } from "child_process";

export function showDirectoryStructure() {
  exec("find ./data -maxdepth 3", (error, stdout, stderr) => {
    if (error) {
      log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      log(`stderr: ${stderr}`);
      return;
    }
    log(`Directory structure:\n${stdout}`);
  });
}
