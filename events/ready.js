const { Events } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		try {
			await client.sequelize.authenticate();
			console.log('Connection to database has been established successfully.');
			// await client.Users.sync({ alter: true });
			await client.Users.sync();
			await client.AiChatHistory.sync();
		} catch (error) {
			console.error('Unable to connect to the database:', error);
		}
	},
};