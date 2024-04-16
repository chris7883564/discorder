import type { Command } from "./types";

const command: Command = {
	name: "template",
	description: "(unused)",
	action: async (interaction) => {
		if (!interaction.isCommand()) {
			return;
		}
		await interaction.reply("template is unused");
	},
	build: (builder) => {
		return builder;
	},
};

export default command;
