import debug from "debug";
import { Client } from "discord.js";
import { commands } from "./commands";

//---------------------------------------------------------------------
import Logger from "@/logger";
const logger = new Logger("bot");

//---------------------------------------------------------------------
export const client = new Client({
  intents: ["GuildVoiceStates", "Guilds", "GuildMembers"],
});

//---------------------------------------------------------------------
async function postLinkDiscorder(username: string) {
  const response = await fetch(
    "https://trustworthy-kudu-486.convex.site/linkdiscorder",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author: username, body: "ready" }),
    },
  );
  if (!response.ok) {
    throw new Error(response.statusText);
  }

  // Assuming you want to do something with the response
  // const data = await response.json(); // or .text() if it's not JSON
  // logger.info(data);
  logger.info(response.statusText);
}

//---------------------------------------------------------------------
client.on("ready", () => {
  logger.info(`client logged in as ${client.user?.tag}`);
  postLinkDiscorder(client.user ? client.user.tag : "unknown").catch(
    console.error,
  );
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
    const serverUrl =
      "https://trustworthy-kudu-486.convex.site/discord/linkguild";
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
client.on("interactionCreate", (interaction) => {
  if (!interaction.isCommand()) {
    return;
  }
  try {
    logger.info("Command received: %s", interaction.commandName);
    const command = commands.find(
      (cmd) => cmd.name === interaction.commandName,
    );
    if (!command) {
      return;
    }
    logger.info("Executing command: %s", command.name);
    command.action(interaction);
  } catch (error) {
    console.error("interactionCreate error: ", error);
  }
});
