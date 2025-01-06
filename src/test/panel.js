import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

const BOT_TOKEN = process.env.BOT_TOKEN;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  // Only respond to a specific command
  if (message.content === "!panel") {
    // Create the initial panel
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("Interactive Panel")
      .setDescription("Click the buttons below to interact!")
      .addFields({ name: "Counter", value: "0", inline: true });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("increment")
        .setLabel("+1")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("decrement")
        .setLabel("-1")
        .setStyle(ButtonStyle.Danger),
    );

    const panelMessage = await message.channel.send({
      embeds: [embed],
      components: [buttons],
    });

    // Set up a collector to listen for button interactions
    const collector = panelMessage.createMessageComponentCollector({
      time: 60000, // Collect interactions for 60 seconds
    });

    let counter = 0;

    collector.on("collect", async (interaction) => {
      if (!interaction.isButton()) return;

      // Update counter based on the button clicked
      if (interaction.customId === "increment") counter++;
      if (interaction.customId === "decrement") counter--;

      // Update the embed with the new counter value
      const updatedEmbed = EmbedBuilder.from(embed).setFields({
        name: "Counter",
        value: counter.toString(),
        inline: true,
      });

      await interaction.update({
        embeds: [updatedEmbed],
        components: [buttons],
      });
    });

    collector.on("end", () => {
      // Disable buttons when the collector ends
      const disabledButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("increment")
          .setLabel("+1")
          .setStyle(ButtonStyle.Success)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("decrement")
          .setLabel("-1")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true),
      );

      panelMessage.edit({
        components: [disabledButtons],
      });
    });
  }
});

client.login(BOT_TOKEN);
