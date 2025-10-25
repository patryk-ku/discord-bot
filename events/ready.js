const { Events } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`\nReady! Logged in as ${client.user.tag}.`);
		console.log(`Running in ${process.env.NODE_ENV} mode.`);

		// Notify bot owner about bot instance start
		if (process.env.NODE_ENV === 'production') {
			client.users.send(
				process.env.OWNER_ID,
				`✅ Ready! Logged in as \`${client.user.tag}\``
			);
		}

		try {
			await client.sequelize.authenticate();
			console.log('Connection to database has been established successfully.');
			// await client.Users.sync({ alter: true });
			// await client.Users.sync();
			// await client.geminiChat.sync();
			await client.sequelize.sync();
		} catch (error) {
			console.error(`Unable to connect to the database: ${error}`);

			// Notify bot owner about database error
			if (process.env.NODE_ENV === 'production') {
				client.users.send(
					process.env.OWNER_ID,
					`❌ Unable to connect to the database: ${error}`
				);
			}
		}
	},
};
