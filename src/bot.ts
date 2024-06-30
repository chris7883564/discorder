import debug from "debug";
import { Client } from "discord.js";
import { commands } from "./commands";

const log = debug("bot");
log.enabled = true;

export const bot = new Client({
  intents: ["GuildVoiceStates", "Guilds"],
});

bot.on("ready", () => {
  log("Logged in as ${bot.user.tag}!");
});

bot.on("interactionCreate", (interaction) => {
  if (!interaction.isCommand()) {
    log("Interaction received: %s %s", interaction.type, interaction.guildId);
    return;
  }
  try {
    log("Command received: %s", interaction.commandName);
    const command = commands.find(
      (cmd) => cmd.name === interaction.commandName,
    );
    if (!command) {
      return;
    }
    log("Executing command: %s", command.name);
    command.action(interaction);
  } catch (error) {
    console.error("interactionCreate error: ", error);
  }
});
