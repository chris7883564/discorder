import debug from "debug";
import fs from "node:fs";
import { joinVoiceChannel } from "@discordjs/voice";
import { add, tasks } from "../recorder";
import { uploadFileToConvex } from "../recorder/convexuploader";
import type { Command } from "./types";

import { NonRealTimeVAD, NonRealTimeVADOptions } from "@ricky0123/vad-node";

//---------------------------------------------------------------------
import Logger from "@/logger";
import { CONVEX_SITE_URL } from "@/config";
import { stopMuseSession } from "./stop";
const logger = new Logger("commands");

logger.enable();

// VAD CONTROL
const USE_VAD = process.env.USE_VAD ? true : false;
logger.info("USE_VAD", USE_VAD);

//---------------------------------------------------------------------
const command: Command = {
  name: "start",
  description: "Start the recorder in the current voice channel",
  action: async (interaction) => {
    logger.info("command received: start");

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
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: true,
      debug: true,
    });

    // START
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
    logger.info(response.status, response.statusText);
    if (!response.ok) {
      const msg = `Failed to start the recording session with Muse. ${response.status} ${response.statusText}`;
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

    // log file structure for debugging
    // showDirectoryStructure()

    // VAD setup
    const options: Partial<NonRealTimeVADOptions> = {};
    const myvad = await NonRealTimeVAD.new(options);

    //----- event handler for when recording is done
    //
    recorder.on(
      "recorded",
      async (
        wav_filename: string,
        user_id: string,
        time_offset: number,
        session_id: string,
        guild_id: string,
        channel_id: string,
        metadata: string,
      ) => {
        //
        const username =
          channel.guild.members.cache.get(user_id)?.displayName ?? user_id;

        //
        // VAD
        //
        let bFoundVADVoice = !USE_VAD; // default to true if there's no VAD in use
        if (USE_VAD) {
          const fileBuffer = await fs.readFileSync(wav_filename);
          // Convert Buffer to Float32Array
          const float32Array = new Float32Array(
            fileBuffer.buffer,
            fileBuffer.byteOffset,
            fileBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT,
          );
          for await (const { audio, start, end } of myvad.run(
            float32Array,
            16000,
          )) {
            logger.info(time_offset, start, end);
            bFoundVADVoice = true;
            break;
            // do stuff with
            //   audio (float32array of audio)
            //   start (milliseconds into audio where speech starts)
            //   end (milliseconds into audio where speech ends)
          }
          if (!bFoundVADVoice)
            logger.info(time_offset + "no speech detected in burst");
        }

        // upload file to convex, then delete it from local storage
        if (bFoundVADVoice) {
          uploadFileToConvex(
            wav_filename,
            username,
            session_id,
            user_id,
            time_offset,
            guild_id,
            channel_id,
          )
            .then(() => {
              // delete the file after upload, even if the upload fails (lost forever)
              fs.unlink(wav_filename, (err) => {
                if (err) {
                  logger.error("Failed to delete " + wav_filename, err);
                }
              });
            })
            .catch((e) => {
              logger.error("Failed to upload " + wav_filename, e);
            });
        }
      },
    );

    // await interaction.reply(`Recording has started.`);
    await interaction.followUp(`Recording has started.`);
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
