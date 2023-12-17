const { SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

module.exports = {
	data: new SlashCommandBuilder()
		.setName('debug')
		.setDescription('Get debug info.')
		.addSubcommand(subcommand =>
			subcommand
				.setName('user')
				.setDescription('Debug info about a user.'),
			// .addUserOption(option => option.setName('target').setDescription('The user'))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('server')
				.setDescription('Debug info about the server.'))
		.addSubcommand(subcommand =>
			subcommand
				.setName('termux')
				.setDescription('Debug info about the Termux instance (if in use).'))
		.setDefaultMemberPermissions(0)
		.setDMPermission(false),
	async execute(interaction) {
		switch (interaction.options.getSubcommand()) {
			case 'user': {
				// interaction.user is the object representing the User who ran the command
				// interaction.member is the GuildMember object, which represents the user in the specific guild
				await interaction.reply(`This command was run by ${interaction.user.username}, who joined on ${interaction.member.joinedAt}.`);
				console.log(interaction.user);
				console.log(interaction);
				// await interaction.channel.send('dummy message');
				return;
			}

			case 'server': {
				await interaction.reply(`This server is ${interaction.guild.name} and has ${interaction.guild.memberCount} members.`);
				console.log(interaction.guild.members);

				// const users = await interaction.guild.members.fetch();
				// console.log(users);
				return;
			}

			case 'termux': {
				await interaction.deferReply();

				if (!process.env.TERMUX) {
					return interaction.editReply('Termux compatibility is disabled in config.');
				}

				let infoString = '';
				let battery = '';
				try {
					const { error, stdout, stderr } = await execPromise('termux-battery-status');
					if (error) {
						console.log(error);
					}
					if (stderr) {
						console.log(stderr);
					}
					console.log(stdout);
					battery = JSON.parse(stdout);
					infoString += `### Battery \n├ **${battery.percentage}%**\n├ ${Number(battery.temperature).toFixed(1)} °C\n├ ${battery.plugged}\n└ ${battery.status}\n`;
				} catch (error) {
					console.log(`error: ${error}`);
					// return interaction.editReply('Failed to show Termux info.');
				}

				let uptime = '';
				try {
					const { error, stdout, stderr } = await execPromise('uptime -p');
					if (error) {
						console.log(error);
					}
					if (stderr) {
						console.log(stderr);
					}
					console.log(stdout);
					uptime = stdout.split(',');
					uptime[0] = uptime[0].slice(2);
					infoString += `### Uptime \n├ ${uptime[0]}\n├ ${uptime[1]}\n└ ${uptime[2]}\n`;
				} catch (error) {
					console.log(`error: ${error}`);
				}

				if (infoString == '') {
					return interaction.editReply('Failed to show any Termux info.');
				}

				return interaction.editReply(infoString);
			}

			default: {
				return interaction.reply({ content: 'Error: Missing subcommand.', ephemeral: true });
			}
		}
	},
};