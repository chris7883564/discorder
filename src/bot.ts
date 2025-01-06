import { Client, VoiceState } from "discord.js";
import { commands } from "./commands";

import { GatewayIntentBits } from "discord.js";
import { joinVoiceChannel, AudioReceiveStream } from "@discordjs/voice";

import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

import { GUILD_ID } from "./config";
const CHANNEL_ID = "1225376114818420761";

//---------------------------------------------------------------------
import Logger from "@/logger";
import { CONVEX_SITE_URL } from "./config";
const logger = new Logger("bot");
logger.enable();

//---------------------------------------------------------------------
export const client = new Client({
  intents: [
    "GuildVoiceStates",
    "Guilds",
    "GuildMembers",
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

//---------------------------------------------------------------------
// client.on("ready", () => {
//   logger.info(`client logged in as ${client.user?.tag}`);
// });

client.once("ready", async () => {
  console.log(`Logged in as ${client.user?.tag}`);

  const guild = await client.guilds.fetch(GUILD_ID);
  const channel = guild.channels.cache.get(CHANNEL_ID);

  if (!channel || channel.type !== 2) {
    // Ensure it's a voice channel
    console.error("Invalid channel specified");
    return;
  }

  console.info("Joining voice channel...");
  const connection = joinVoiceChannel({
    channelId: CHANNEL_ID,
    guildId: GUILD_ID,
    adapterCreator: guild.voiceAdapterCreator,
  });
  const receiver = connection.receiver;

  // Start listening for incoming audio streams
  console.info("Listening for audio...");
  connection.on("stateChange", (oldState: any, newState: any) => {
    console.log(
      `Connection state changed: ${oldState.status} -> ${newState.status}`,
    );
  });

  receiver.speaking.on("start", (userId: any) => {
    console.log(`Receiving audio from user: ${userId}`);

    const audioStream = receiver.subscribe(userId, {
      end: {
        behavior: AudioReceiveStream.EndBehaviorType.Manual,
      },
    });

    const outputFilePath = `./recordings/${userId}-${Date.now()}.pcm`;
    const writeStream = fs.createWriteStream(outputFilePath);

    ffmpeg(audioStream)
      .setFfmpegPath(ffmpegPath)
      .inputFormat("s16le")
      .audioCodec("libmp3lame")
      .audioBitrate(128)
      .saveToFile(outputFilePath)
      .on("end", () => {
        console.log(`Audio saved to ${outputFilePath}`);
      })
      .on("error", (err: any) => {
        console.error(`Error saving audio: ${err.message}`);
      });

    audioStream.pipe(writeStream);
  });
});

//---------------------------------------------------------------------
client.on("guildCreate", async (guild) => {
  logger.info(`Bot added to guild: ${guild.name} (id: ${guild.id}).`);

  try {
    const user = await client.users.fetch(guild.ownerId);
    logger.info(`Guild Owner's username: ${user.username}`);
  } catch (error) {
    logger.error("Error fetching user:", error);
  }

  try {
    const serverUrl = CONVEX_SITE_URL + "/discord/linkguild";
    const data = {
      guild_id: guild.id,
      guild_name: guild.name,
      guild_systemChannelId: guild.systemChannelId,
      guild_ownerId: guild.ownerId,
    };
    const response = await fetch(serverUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    logger.info(response.statusText);
  } catch (error) {
    logger.error("guildCreate error: ", error);
  }
});

//---------------------------------------------------------------------
client.on("guildDelete", async (guild) => {
  logger.info(`Bot deleted from guild: ${guild.name} (id: ${guild.id}).`);
  try {
    const serverUrl = CONVEX_SITE_URL + "/discord/unlinkguild";
    const data = { guild_id: guild.id };
    const response = await fetch(serverUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      logger.error(response.status, response.statusText);
      throw new Error(response.statusText);
    }
    logger.info(response.statusText);
  } catch (error) {
    logger.error("guildDelete error: ", error);
  }
});

//---------------------------------------------------------------------
client.on("interactionCreate", (interaction) => {
  if (!interaction.isCommand()) {
    return;
  }
  try {
    logger.info("Command received: " + interaction.commandName);
    const command = commands.find(
      (cmd) => cmd.name === interaction.commandName,
    );
    if (!command) {
      return;
    }
    logger.info("Executing command: " + command.name);
    command.action(interaction);
  } catch (error) {
    logger.error("interactionCreate error: ", error);
  }
});
