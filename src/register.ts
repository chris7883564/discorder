import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { commands } from "./commands";
import { BOT_ID, BOT_TOKEN } from "./config";

const body = commands.map((cmd) => {
  const builder = new SlashCommandBuilder()
    .setName(cmd.name)
    .setDescription(cmd.description);
  return (cmd.build ? cmd.build(builder) : builder).toJSON();
});

const rest = new REST().setToken(BOT_TOKEN);

(async () => {
  try {
    logger.info("Deleting all application (/) commands.");
    // await rest.delete( Routes.applicationCommand(BOT_ID, '1226660349726691560') );
    logger.info("Complete.");

    logger.info("Started refreshing application (/) commands.");
    logger.info(body);
    await rest.put(Routes.applicationCommands(BOT_ID), { body });
    logger.info("Complete.");
  } catch (error) {
    logger.error(error);
  }
})();
