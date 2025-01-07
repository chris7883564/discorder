// "use node";

// import debug from "debug";
// const baseNamespace = "convexuploader";
// const logInfo = debug(`${baseNamespace}:info`);
// const logWarn = debug(`${baseNamespace}:warn`);
// const logError = debug(`${baseNamespace}:error`);
// logInfo.enabled = true;
// logWarn.enabled = true;
// logError.enabled = true;
// To enable only error logs:
// DEBUG=convexuploader:error node yourApp.js
// DEBUG=convexuploader:warn,convexuploader:error node yourApp.js

import fs from "node:fs";

import Logger from "@/logger";
import { CONVEX_SITE_URL } from "@/config";
import { log } from "node:console";
const logger = new Logger("convexuploader");

logger.enable();

// --------------------------------------------------------------------------------------------------
export async function uploadFileToConvex(
  filename: string,
  username: string,
  session_id: string,
  talker_id: string,
  time_offset: number,
  guild_id: string,
  channel_id: string,
) {
  try {
    // upload the file to convex
    const uploadURL = new URL(`${CONVEX_SITE_URL}/discord/upload`);
    const file = await fs.readFileSync(filename);

    // set all the parameters, eg. talkerID, guild etc.
    uploadURL.searchParams.set("guild_id", guild_id);
    uploadURL.searchParams.set("username", username);
    uploadURL.searchParams.set("session_id", session_id);
    uploadURL.searchParams.set("talker_id", talker_id);
    uploadURL.searchParams.set("channel_id", channel_id);
    uploadURL.searchParams.set("time_offset", String(time_offset));
    logger.info("POST ", uploadURL.href);

    const result = await fetch(uploadURL, {
      method: "POST",
      headers: { "Content-Type": "audio/wav" },
      body: new Uint8Array(file.buffer), // was file.buffer
    });
    logger.http(result, `writing ${file.buffer.byteLength} bytes`);
  } catch (e) {
    logger.error("error: ", e);
  }
}
