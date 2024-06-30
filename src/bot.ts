import debug from "debug";
import { Client } from "discord.js";
import { commands } from "./commands";

const log = debug("bot");
log.enabled = true;

export const bot = new Client({
  intents: ["GuildVoiceStates", "Guilds"],
});

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
    throw new Error("Network response was not ok");
  }

  // Assuming you want to do something with the response
  const data = await response.json(); // or .text() if it's not JSON
  console.log(data);
}

bot.on("ready", () => {
  log(`Logged in as ${bot.user?.tag}`);
  postLinkDiscorder(bot.user ? bot.user.tag : "unknown").catch(console.error);
});

bot.on("interactionCreate", (interaction) => {
  if (!interaction.isCommand()) {
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
