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

// function ms_to_time(ms: number) {
//   const seconds = Math.floor((ms / 1000) % 60);
//   const minutes = Math.floor((ms / (1000 * 60)) % 60);
//   const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

//   return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
// }
