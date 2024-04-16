/*
 * Description: Discord.js v14 Remove Slash Commands script
 * Author: hmes98318
 * License: MIT
 * node_modules: discord.js
 */

import { REST, Routes } from "discord.js";
// const { Routes } = require('discord-api-types/v10');
import { BOT_ID, BOT_TOKEN, GUILD_ID } from "./config";

const removeGlobally = (TOKEN: string, CLIENT_ID: string) => {
	const rest = new REST({ version: "10" }).setToken(TOKEN);

	rest.get(Routes.applicationCommands(CLIENT_ID))
		//@ts-ignore
		.then((data) => {
			const promises = [];
			for (const command of data) {
				const deleteUrl = `${Routes.applicationCommands(CLIENT_ID)}/${command.id}`;
				console.log(deleteUrl);
				promises.push(rest.delete(deleteUrl));
			}
			return Promise.all(promises);
		});
};

const removeGuild = (TOKEN: string, CLIENT_ID: string, GUILD_ID: string) => {
	const rest = new REST({ version: "10" }).setToken(TOKEN);
	rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)).then((data) => {
		const promises = [];
		for (const command of data) {
			const deleteUrl = `${Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)}/${
				command.id
			}`;
			console.log(deleteUrl);
			promises.push(rest.delete(deleteUrl));
		}
		return Promise.all(promises);
	});
};

(async () => {
	try {
		console.log("Deleting all application (/) commands.");
		removeGlobally(BOT_TOKEN, BOT_ID);
		console.log("Complete.");
		console.log("Deleting all guild application (/) commands.");
		removeGuild(BOT_TOKEN, BOT_ID, GUILD_ID);
		console.log("Complete.");
	} catch (error) {
		console.error(error);
	}
})();
