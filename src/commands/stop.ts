import { sign } from "node:crypto";
import { remove, tasks } from "../recorder";
import type { Command } from "./types";

//---------------------------------------------------------------------
import Logger from "@/logger";
import { CONVEX_SITE_URL } from "@/config";
const logger = new Logger("commands");
logger.disable();

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

  logger.info("stopMuseSession: stopping recorder for ", interaction_member_id);
  logger.info(
    "username = ",
    interaction_member_id.username,
    "guild_id = ",
    recorder?.user.guild.id,
  );

  const payload = JSON.stringify({ session_id: recorder?.session_id });
  const response = await fetch(CONVEX_SITE_URL + "/discord/stop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  logger.info(response.status, response.statusText);
  if (!response.ok) {
    const msg = `Failed to stop the recording session with Muse service. ${response.status} ${response.statusText}`;
    logger.error(msg);
    // await interaction.reply(msg);
    // throw new Error("Failed to stop session with Muse service");
    return msg;
  }
  return null;
};

//---------------------------------------------------------------------
const command: Command = {
  name: "stop",
  description: "Stop the Muse recorder you started",
  action: async (interaction) => {
    logger.info("command received: stop");

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
      await interaction.reply("Recording has stopped.");

      // showDirectoryStructure()
      // const data = removed.gather();
      // const transcription = data
      // 	.map(([t, u, c]) => `[${ms_to_time(t)}] ${u}: ${c}`)
      // 	.join("\n");
      // await interaction.followUp({
      // 	files: [
      // 		{
      // 			name: "transcription.txt",
      // 			attachment: Buffer.from(transcription),
      // 		},
      // 	],
      // });
    } else {
      await interaction.reply("You didn't start the recorder!");
    }
  },
};

export default command;
