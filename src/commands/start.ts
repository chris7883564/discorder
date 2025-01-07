import fs from "node:fs";
import { joinVoiceChannel } from "@discordjs/voice";
import { add, tasks } from "../recorder";
import type { Command } from "./types";

//---------------------------------------------------------------------
import Logger from "@/logger";
import { CONVEX_SITE_URL } from "@/config";
import { stopMuseSession } from "./stop";
const logger = new Logger("commands");

logger.enable();

//---------------------------------------------------------------------
const command: Command = {
  name: "start",
  description: "Ask Muse to start listening to the current voice channel",
  action: async (interaction) => {
    if (
      !interaction.isCommand() ||
      !interaction.isChatInputCommand() ||
      !interaction.member
    ) {
      return;
    }

    // const eula = manager.get(interaction.user.id).eula;
    // if (!eula) {
    // 	await interaction.reply( "You need to accept the EULA first! Use `/eula view` to view the EULA and `/eula accept` to accept it." );
    // 	return;
    // }

    if (!("voice" in interaction.member)) {
      const msg = "You need to join a voice channel first!";
      logger.error(msg);
      await interaction.reply(msg);
      return;
    }

    const { channel } = interaction.member.voice;
    if (!channel) {
      const msg = "You need to join a voice channel first!";
      logger.error(msg);
      await interaction.reply(msg);
      return;
    }

    const permissions = channel.permissionsFor(interaction.client.user);
    if (
      !permissions?.has("Connect") ||
      !permissions.has("Speak") ||
      !permissions.has("UseVAD")
    ) {
      const msg =
        "I need the permissions to join and speak in your voice channel!";
      logger.error(msg);
      await interaction.reply(msg);
      return;
    }

    //----- process options from the command
    //
    // const language = interaction.options.getString("language");
    // const prompt = interaction.options.getString("prompt");
    // const live_chan = interaction.options.getChannel("channel");
    // logger.info(live_chan, language, prompt);
    // if (!live_chan || !("send" in live_chan)) {
    // 	logger.info("Invalid live channel!");
    // 	await interaction.reply("Invalid live channel!");
    // 	return;
    // }

    // defer
    interaction.deferReply();

    // TODO: if there's an existing session, close it first
    const existing_recorder = tasks.get(interaction.member.id);
    if (existing_recorder) {
      const msg = "Found an existing session, issuing /stop automatically.";
      logger.warn(msg);
      stopMuseSession(interaction.member.id);
      // await interaction.reply(msg);
      // return;
    }

    // ----- process options from the command
    const gamePIN = interaction.options.getString("gamepin");
    logger.info(`gamePIN ${gamePIN}`);
    if (!gamePIN) {
      const msg = `Invalid game PIN. Please enter a 6-digit game PIN code for your Muse Game eg. 544231`;
      await interaction.followUp(msg);
      logger.error(msg);
      // await interaction.reply(msg);
      return;
    }

    // ----- check if the PIN exists against a game in the convex database
    const response_game = await fetch(
      CONVEX_SITE_URL + "/discord/preflight?gamePIN=" + gamePIN,
    );
    if (!response_game.ok) {
      const msg = `No game found for that PIN number - check again. ${response_game.status} ${response_game.statusText}`;
      logger.error(msg);
      await interaction.followUp(msg);
      return;
    }
    const game = (await response_game.json()) as { session_id: string };
    logger.info("Game found: " + game);

    // JOIN VOICE CHANNEL
    // ---- ok now we can start the new voice channel recording
    const conn = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      // @ts-expect-error
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: true,
      debug: true,
    });

    // TELL MUSE WE ARE STARTING
    // connect to muse convex database and create a new session
    const payload = JSON.stringify({
      gamePIN: gamePIN,
      discordserverId: channel.guild.id,
      discordServerName: channel.guild.name,
      interactionMemberId: interaction.member.id,
    });
    logger.info(payload);
    const response = await fetch(CONVEX_SITE_URL + "/discord/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    logger.http(response);
    if (!response.ok) {
      const msg = `Sorry, I was unable to connect to your game session. ${response.status} ${response.statusText}`;
      // await interaction.reply(msg);
      await interaction.followUp(msg);
      // throw new Error("Failed to stop session with Muse service");
      return;
    }

    const jsonResponse = (await response.json()) as { session_id: string };
    const session_id = jsonResponse.session_id;
    logger.info("Session ID: " + session_id);

    // start the recorder object
    // save the session_id

    const recorder = add(session_id, conn, channel, interaction.member);

    // GABAE

    // await interaction.reply(`Recording has started.`);
    await interaction.followUp(
      `OK, I'm connected and listening to the game!  Tell me to disconnect by typing /stop.  I'll disconnect automatically when everyone leaves too.`,
    );
  },
  build: (builder) => {
    logger.info("Building start command");
    builder.addStringOption((option) =>
      option
        .setName("gamepin")
        .setDescription(
          "Enter the 6-digit game PIN code for your Muse Game eg. 544232",
        )
        .setRequired(true)
        .setMinLength(6)
        .setMaxLength(8),
    );
    return builder;
  },
};

export default command;
