import debug from "debug";
import fs from "node:fs";
import { joinVoiceChannel } from "@discordjs/voice";
import { add, tasks } from "../recorder";
import { uploadFileToConvex } from "../recorder/convexuploader";
import type { Command } from "./types";
import { showDirectoryStructure } from "./utils";

//---------------------------------------------------------------------
const log = debug("bot:commands");
log.enabled = true;

//---------------------------------------------------------------------
const command: Command = {
  name: "start",
  description: "Start the recorder in the current voice channel",
  action: async (interaction) => {
    if (!interaction.isCommand()) {
      return;
    }

    if (!interaction.isChatInputCommand()) {
      return;
    }

    if (!interaction.member) {
      return;
    }

    // const eula = manager.get(interaction.user.id).eula;
    // if (!eula) {
    // 	await interaction.reply( "You need to accept the EULA first! Use `/eula view` to view the EULA and `/eula accept` to accept it." );
    // 	return;
    // }

    if (!("voice" in interaction.member)) {
      await interaction.reply("You need to join a voice channel first!");
      return;
    }

    const { channel } = interaction.member.voice;
    if (!channel) {
      await interaction.reply("You need to join a voice channel first!");
      return;
    }

    const permissions = channel.permissionsFor(interaction.client.user);
    if (
      !permissions?.has("Connect") ||
      !permissions.has("Speak") ||
      !permissions.has("UseVAD")
    ) {
      await interaction.reply(
        "I need the permissions to join and speak in your voice channel!",
      );
      return;
    }

    //----- process options from the command
    //
    // const language = interaction.options.getString("language");
    // const prompt = interaction.options.getString("prompt");
    // const live_chan = interaction.options.getChannel("channel");
    // console.log(live_chan, language, prompt);
    // if (!live_chan || !("send" in live_chan)) {
    // 	console.log("Invalid live channel!");
    // 	await interaction.reply("Invalid live channel!");
    // 	return;
    // }

    // TODO: if there's an existing session, close it first
    const existing_recorder = tasks.get(interaction.member.id);
    if (existing_recorder) {
      console.log("Please stop the existing recording first with /stop");
      await interaction.reply(
        "Please stop the existing recording first with /stop",
      );
      return;
    }

    // ----- process options from the command
    const pin = interaction.options.getString("pin");
    console.log("PIN ", pin);
    if (!pin) {
      const msg =
        "Please endter the PIN from your settings screen for your Muse Game";
      console.log(msg);
      await interaction.reply(msg);
      return;
    }

    // ---- ok now we can start the new voice channel recording
    const conn = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: true,
      debug: true,
    });

    // connect to muse convex database and create a new session
    const payload = JSON.stringify({
      sessionPIN: pin,
      discordserverId: channel.guild.id,
      description: "from discorder",
    });
    console.log(payload);
    const response = await fetch(
      "https://trustworthy-kudu-486.convex.site/discord/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      },
    );
    console.log(response.status, response.statusText);
    if (!response.ok) {
      throw new Error("Failed to start session with Muse service");
    }

    // start the recorder object
    // save the session_id
    const recorder = add(conn, channel, interaction.member);

    // log file structure for debugging
    // showDirectoryStructure()

    //----- event handler for when recording is done
    //
    recorder.on(
      "recorded",
      async (
        wav_filename: string,
        user_id: string,
        time_offset: number,
        guild_id: string,
        channel_id: string,
        metadata: string,
      ) => {
        //
        const username =
          channel.guild.members.cache.get(user_id)?.displayName ?? user_id;

        // upload file to convex, then delete it from local storage
        uploadFileToConvex(
          wav_filename,
          username,
          user_id,
          time_offset,
          guild_id,
          channel_id,
        )
          .then(() => {
            // delete the file after upload, even if the upload fails (lost forever)
            fs.unlink(wav_filename, (err) => {
              if (err) {
                log("Failed to delete", wav_filename, err);
              }
            });
          })
          .catch((e) => {
            log("Failed to upload", wav_filename, e);
          });
      },
    );

    await interaction.reply(
      `Recording has started.  Your Discord Server ID is {channel.guild.id}`,
    );
  },
  build: (builder) => {
    console.log("Building start command");
    builder.addStringOption((option) =>
      option
        .setName("pin")
        .setDescription("Muse Game PIN code")
        .setRequired(true)
        .setMinLength(4)
        .setMaxLength(4),
    );
    return builder;
  },
  // build: (builder) => {
  // 	console.log("Building start command");
  // 	builder
  // 		.addStringOption((option) =>
  // 			option
  // 				.setName("language")
  // 				.setDescription("The language of the recording")
  // 				.setRequired(false)
  // 				.setChoices(
  // 					...[
  // 						{ name: "Auto", value: "auto" },
  // 						{ name: "Chinese", value: "zh" },
  // 						{ name: "Czech", value: "cs" },
  // 						{ name: "Dutch", value: "nl" },
  // 						{ name: "English", value: "en" },
  // 						{ name: "French", value: "fr" },
  // 						{ name: "German", value: "de" },
  // 						{ name: "Indonesian", value: "id" },
  // 						{ name: "Italian", value: "it" },
  // 						{ name: "Japanese", value: "ja" },
  // 						{ name: "Korean", value: "ko" },
  // 						{ name: "Polish", value: "pl" },
  // 						{ name: "Portuguese", value: "pt" },
  // 						{ name: "Romanian", value: "ro" },
  // 						{ name: "Russian", value: "ru" },
  // 						{ name: "Spanish", value: "es" },
  // 						{ name: "Swedish", value: "sv" },
  // 						{ name: "Thai", value: "th" },
  // 						{ name: "Turkish", value: "tr" },
  // 					],
  // 				),
  // 		)
  // 		.addStringOption((option) =>
  // 			option
  // 				.setName("prompt")
  // 				.setDescription("The prompt to use")
  // 				.setRequired(false)
  // 				.setMinLength(1)
  // 				.setMaxLength(100),
  // 		)
  // 		.addChannelOption((option) =>
  // 			option
  // 				.setName("channel")
  // 				.setDescription("The text channel to send transcriptions to")
  // 				.setRequired(false),
  // 		);

  // 	return builder;
  // },
};

export default command;
