// "use node";

import debug from "debug";
const log = debug("convexuploader");
log.enabled = true;

import "../envConfig";
import fs from "node:fs";

const convexSiteUrl = process.env.CONVEX_SITE_URL;
log("CONVEX_SITE_URL = " + convexSiteUrl);

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
    const uploadURL = new URL(`${convexSiteUrl}/discord/upload`);
    const file = await fs.readFileSync(filename);

    // set all the parameters, eg. talkerID, guild etc.
    uploadURL.searchParams.set("guild_id", guild_id);
    uploadURL.searchParams.set("username", username);
    uploadURL.searchParams.set("session_id", session_id);
    uploadURL.searchParams.set("talker_id", talker_id);
    uploadURL.searchParams.set("channel_id", channel_id);
    uploadURL.searchParams.set("time_offset", String(time_offset));
    log(filename);
    log(uploadURL.href);

    const result = await fetch(uploadURL, {
      method: "POST",
      headers: { "Content-Type": "audio/wav" },
      body: file.buffer,
    });
    log(result.status, file.buffer.byteLength);
  } catch (e) {
    log("error: ", e);
  }
}
