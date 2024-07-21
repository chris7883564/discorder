import { sign } from "node:crypto";
import { remove, tasks } from "../recorder";
import type { Command } from "./types";
import { showDirectoryStructure } from "./utils";

//---------------------------------------------------------------------
// returns string if there's an error
// returns null if no error
//---------------------------------------------------------------------
export const stopMuseSession = async (
  interaction_member_id: any,
): Promise<string | null> => {
  if (!interaction_member_id) return null;

  // connect to muse convex database and create a new session
  const recorder = tasks.get(interaction_member_id);
  const payload = JSON.stringify({ session_id: recorder?.session_id });
  console.log(payload);
  const response = await fetch(
    "https://trustworthy-kudu-486.convex.site/discord/stop",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    },
  );
  console.log(response.status, response.statusText);
  if (!response.ok) {
    const msg = `Failed to stop the recording session with Muse service. ${response.status} ${response.statusText}`;
    console.log(msg);
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

function ms_to_time(ms: number) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
