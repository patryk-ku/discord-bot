const { SlashCommandBuilder, ActivityType } = require('discord.js');
require('dotenv').config();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('config')
		.setDescription('Bot config commands')
		.addSubcommand(subcommand =>
			subcommand
				.setName('status')
				.setDescription('Set bot status.')
				.addStringOption(option =>
					option.setName('status')
						.setDescription('Status option.')
						.addChoices(
							{ name: 'online', value: 'online' },
							{ name: 'idle', value: 'idle' },
							{ name: 'dnd', value: 'dnd' },
							{ name: 'invisible', value: 'invisible' },
						)
						.setRequired(true)),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('activity')
				.setDescription('Set bot activity.')
				.addStringOption(option =>
					option.setName('string')
						.setDescription('Activity string, to clear omit this option.'))
				.addStringOption(option =>
					option.setName('type')
						.setDescription('Activity type.')
						.addChoices(
							{ name: 'Watching', value: 'Watching' },
							{ name: 'Listening', value: 'Listening' },
							{ name: 'Competing', value: 'Competing' },
						)),
		)
		.setDefaultMemberPermissions(0)
		.setDMPermission(true),
	async execute(interaction) {
		if (interaction.user.id != process.env.OWNER_ID) {
			return interaction.reply('These commands can only be used by the owner of an instance of this bot');
		}

		switch (interaction.options.getSubcommand()) {
			case 'status': {
				await interaction.deferReply();
				const status = interaction.options.getString('status');
				interaction.client.user.setStatus(status);
				return interaction.editReply(`Bot status set to: **${status}**.`);
			}

			case 'activity': {
				await interaction.deferReply();
				const str = interaction.options.getString('string');
				const type = interaction.options.getString('type');

				if (!type) {
					await interaction.client.user.setActivity(str);
					return interaction.editReply(`Bot activity set to: **${str}**.`);
				}

				if (!str) {
					return interaction.editReply('Activity string cannot be empty to set activity type.');
				}

				if (type == 'Watching') {
					await interaction.client.user.setActivity(str, { type: ActivityType.Watching });
				} else if (type == 'Listening') {
					await interaction.client.user.setActivity(str, { type: ActivityType.Listening });
				} else if (type == 'Competing') {
					await interaction.client.user.setActivity(str, { type: ActivityType.Competing });
				}

				return interaction.editReply(`Bot activity type set to: **${type}**. Bot status set to: **${str}**.`);
			}

			default: {
				return interaction.reply({ content: 'Error: Missing subcommand.', ephemeral: true });
			}
		}
	},
};