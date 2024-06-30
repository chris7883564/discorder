import debug from "debug";
import { Client } from "discord.js";
import { commands } from "./commands";

const log = debug("bot");
log.enabled = true;

export const bot = new Client({
  intents: ["GuildVoiceStates", "Guilds"],
});

async function postLinkDiscorder() {
  const response = await fetch(
    "https://trustworthy-kudu-486.convex.site/linkdiscorder",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author: "chris", body: "YourMessageBody" }),
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
  log("Logged in");
  postLinkDiscorder().catch(console.error);
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
