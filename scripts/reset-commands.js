const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
	try {
		console.log('Started reseting (deleting) all application (/) commands.');

		if (process.env.DISCORD_GUILD_ID) {
			await rest.put(
				Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
				{ body: [] },
			);
			console.log('Successfully deleted guild application (/) commands.');
		}

		await rest.put(
			Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
			{ body: [] },
		);
		console.log('Successfully deleted global application (/) commands.');
	} catch (error) {
		console.error(error);
	}
})();