const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { generateDependencyReport } = require('@discordjs/voice');
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
		.addSubcommand(subcommand =>
			subcommand
				.setName('voice')
				.setDescription('Debug info about the voice internals.'))
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

				const embed = new EmbedBuilder()
					.setTimestamp(new Date())
					.setTitle('System stats (Termux):');

				let isFail = true;
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
					embed.addFields({ name: 'Battery:', value: `**${battery.percentage}%**, ${Number(battery.temperature).toFixed(1)}°C (${battery.plugged}, ${battery.status})` });
					isFail = false;
				} catch (error) {
					console.log(`error: ${error}`);
				}

				try {
					const { error, stdout, stderr } = await execPromise('uptime -p');
					if (error) {
						console.log(error);
					}
					if (stderr) {
						console.log(stderr);
					}
					console.log(stdout);
					embed.addFields({ name: 'Uptime:', value: stdout.slice(2) });
					isFail = false;
				} catch (error) {
					console.log(`error: ${error}`);
				}

				try {
					const { error, stdout, stderr } = await execPromise('free -m --si | awk \'FNR == 2 {print $3" MB / "$2" MB"}\'');
					if (error) {
						console.log(error);
					}
					if (stderr) {
						console.log(stderr);
					}
					console.log(stdout);
					embed.addFields({ name: 'RAM:', value: stdout });
					isFail = false;
				} catch (error) {
					console.log(`error: ${error}`);
				}

				if (isFail) {
					return interaction.editReply('Failed to show any Termux info.');
				}

				return interaction.editReply({ content: '', embeds: [embed] });
			}

			case 'voice': {
				await interaction.deferReply();
				const report = generateDependencyReport();
				console.log(report);

				const embed = new EmbedBuilder()
					.setTitle('Voice internals debug info:')
					.setDescription('```' + report + '```');

				return interaction.editReply({ content: '', embeds: [embed] });
			}

			default: {
				return interaction.reply({ content: 'Error: Missing subcommand.', ephemeral: true });
			}
		}
	},
};