import { Client } from "discord.js";
import { commands } from "./commands";

//---------------------------------------------------------------------
import Logger from "@/logger";
import { CONVEX_SITE_URL } from "./config";
const logger = new Logger("bot");
logger.disable();

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
  console.log(`Bot added to guild: ${guild.name} (id: ${guild.id}).`);

  try {
    const user = await client.users.fetch(guild.ownerId);
    console.log(`Guild Owner's username: ${user.username}`);
  } catch (error) {
    console.error("Error fetching user:", error);
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
    console.log(response.statusText);
  } catch (error) {
    console.error("guildCreate error: ", error);
  }
});

//---------------------------------------------------------------------
client.on("guildDelete", async (guild) => {
  console.log(`Bot deleted from guild: ${guild.name} (id: ${guild.id}).`);
  try {
    const serverUrl = CONVEX_SITE_URL + "/discord/unlinkguild";
    const data = { guild_id: guild.id };
    const response = await fetch(serverUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      console.error(response.status, response.statusText);
      throw new Error(response.statusText);
    }
    console.log(response.statusText);
  } catch (error) {
    console.error("guildDelete error: ", error);
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
    console.error("interactionCreate error: ", error);
  }
});
