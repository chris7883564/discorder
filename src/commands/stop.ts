import { sign } from "node:crypto";
import { remove, tasks } from "../recorder";
import type { Command } from "./types";

//---------------------------------------------------------------------
import Logger from "@/logger";
import { CONVEX_SITE_URL } from "@/config";
import { RECORDING_DIR } from "../config";

import { logDirectoryStructure, ms_to_time } from "@/utils";
import { log } from "node:console";
import { Readable } from "node:stream";
const logger = new Logger("commands");
logger.enable();

//---------------------------------------------------------------------
// returns string if there's an error
// returns null if no error
//---------------------------------------------------------------------
export const stopMuseSession = async (
  interaction_member_id: any,
): Promise<string | null> => {
  if (!interaction_member_id) return null;

  // if this is not a valid user, it's already stopped
  const recorder = tasks.get(interaction_member_id);
  if (!recorder) return null;

  logger.info(
    "stopMuseSession: stopping recorder for " + interaction_member_id,
    ", username = " + interaction_member_id.username,
    ", guild_id = " + recorder?.user.guild.id,
  );

  const payload = JSON.stringify({ session_id: recorder?.session_id });
  const url = CONVEX_SITE_URL + "/discord/stop";
  logger.info("POST", url, payload);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  logger.http(response);
  if (!response.ok) {
    const msg = `Sorry, something went wrong when I tried to disconnect.  Make sure everyone leaves the room, and I will disconnect automatically. ${response.status} ${response.statusText}`;
    // await interaction.reply(msg);
    // throw new Error("Failed to stop session with Muse service");
    return msg;
  }

  return null;
};

//---------------------------------------------------------------------
const command: Command = {
  name: "stop",
  description: "Tell Muse to stop listening to the session",
  action: async (interaction) => {
    if (
      !interaction.isCommand() ||
      !interaction.isChatInputCommand() ||
      !interaction.member
    ) {
      return;
    }

    if (!("voice" in interaction.member)) {
      await interaction.reply("You need to join a voice channel first!");
      return;
    }

    // ----- stop muse session in the convex database
    const errormsg = await stopMuseSession(interaction.member.id);
    if (errormsg) {
      await interaction.reply(errormsg);
      return;
    }

    // ----- stop interaction
    const removed = remove(interaction.member);
    if (removed) {
      await interaction.reply("OK, I've stopped listening to the game.");

      // show directory of files
      logDirectoryStructure(RECORDING_DIR);

      // show what's in the text files
      const data = removed.gather();
      const transcription = data
        .map(([t, u, c]) => `[${ms_to_time(t)}] ${u}: ${c}`)
        .join("\n");
      logger.info(transcription);

      // send it back to the discord
      // const transcriptionStream = Readable.from(transcription)
      // await interaction.followUp({
      //   content: "Here's the transcription:",
      //   files: [ { name: "transcription.txt", attachment: transcriptionStream }, // was Buffer.from(transcription) ],
      // })
    } else {
      await interaction.reply(
        "Looks like I'm not listening to this game, so there's nothing to do here.",
      );
    }
  },
};

export default command;
