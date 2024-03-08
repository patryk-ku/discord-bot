const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const Sequelize = require('sequelize');
// const { DataTypes } = require('sequelize');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Create a new client instance
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

// Database
client.sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: './database.sqlite',
});

client.Users = client.sequelize.define(
	'users',
	{
		user: {
			type: Sequelize.STRING,
			unique: true,
		},
		lastfm: Sequelize.STRING,
		locked: Sequelize.BOOLEAN,
		listenbrainz: Sequelize.STRING,
	},
	{
		timestamps: false,
	}
);

client.geminiChat = client.sequelize.define(
	'gemini_chat',
	{
		guild: Sequelize.STRING,
		user: Sequelize.TEXT,
		model: Sequelize.TEXT,
	},
	{
		timestamps: false,
	}
);

// Commands handler
client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(
				`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
			);
		}
	}
}

// Events handler
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);

// Scheduled tasks:
async function termuxBatteryNotif() {
	let battery = '';
	try {
		const { error, stdout, stderr } = await execPromise('termux-battery-status');
		if (error) {
			console.log(error);
		}
		if (stderr) {
			console.log(stderr);
		}
		battery = JSON.parse(stdout);

		if (Number(battery.percentage) < 20 && battery.plugged == 'UNPLUGGED') {
			client.users.send(
				process.env.OWNER_ID,
				`Warning, low battery: ${battery.percentage}%.`
			);
		}
	} catch (error) {
		console.log(`error: ${error}`);
	}
}
if (process.env.TERMUX) {
	setInterval(termuxBatteryNotif, 1000 * 60 * 60);
}
