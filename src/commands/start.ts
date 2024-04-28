import { joinVoiceChannel } from "@discordjs/voice";
import debug from "debug";
import fs from "node:fs";
import { add } from "../recorder";
import { uploadFileToConvex } from "../recorder/convexuploader";
import { local_transcribe, remote_transcribe } from "../transcriber";
import type { Command } from "./types";

const log = debug("bot:commands");
log.enabled = true;

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

		// const language = interaction.options.getString("language");
		// const prompt = interaction.options.getString("prompt");
		// const live_chan = interaction.options.getChannel("channel");
		// console.log(live_chan, language, prompt);
		// if (!live_chan || !("send" in live_chan)) {
		// 	console.log("Invalid live channel!");
		// 	await interaction.reply("Invalid live channel!");
		// 	return;
		// }

		const language = "English";
		const prompt = "";

		const conn = joinVoiceChannel({
			channelId: channel.id,
			guildId: channel.guild.id,
			adapterCreator: channel.guild.voiceAdapterCreator,
			selfDeaf: false,
			selfMute: true,
			debug: true,
		});

		const recorder = add(conn, channel, interaction.member);

		recorder.on(
			"recorded",
			async (wav_filename: string, user_id: string, time_offset: number) => {
				// log("Recorded", wav_filename);

				// upload to convex
				// const basePath = "/Users/chris/workspace/discorder/";
				// const relativeFilePath = "./" + wav.replace(basePath, "");
				// log("Uploading path", relativeFilePath);
				uploadFileToConvex(wav_filename, user_id, time_offset);

				// transcribe
				let text = "";
				if (local_transcribe) {
					const { result } = await local_transcribe(wav_filename, {
						language: language ?? undefined,
						initial_prompt: prompt ?? undefined,
					});
					text = (await result).map((x) => x.text).join(" ");
				} else if (remote_transcribe) {
					const { result } = await remote_transcribe(wav_filename, {
						language: language ?? undefined,
						prompt: prompt ?? undefined,
					});
					text = result.map((x) => x.text).join(" ");
				}

				if (text) {
					const fp = wav_filename.replace(/\.wav$/, ".txt");
					fs.writeFileSync(fp, text);

					const username =
						channel.guild.members.cache.get(user_id)?.displayName ?? user_id;
					// await live_chan.send({ content: `**${username}**: ${text}` });
					log(`**${username}**: ${text}`);
				}
			},
		);

		await interaction.reply("Starting the recorder!");
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
