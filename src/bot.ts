import { Client } from "discord.js";
import { commands } from "./commands";

//---------------------------------------------------------------------
import Logger from "@/logger";
import { CONVEX_SITE_URL } from "./config";
const logger = new Logger("bot");
logger.enable();

//---------------------------------------------------------------------
export const client = new Client({
  intents: ["GuildVoiceStates", "Guilds", "GuildMembers"],
});

//---------------------------------------------------------------------
client.on("ready", () => {
  logger.info(`client logged in as ${client.user?.tag}`);
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
    logger.http(response);
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
    logger.http(response);
    if (!response.ok) {
      throw new Error(response.statusText);
    }
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
    command.action(interaction);
  } catch (error) {
    logger.error("interactionCreate error: ", error);
  }
});
