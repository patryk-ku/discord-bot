const { SlashCommandBuilder } = require('discord.js');
const { VoiceConnectionStatus, entersState, getVoiceConnection } = require('@discordjs/voice');
const { createWarningEmbed, createErrorEmbed } = require('../../helpers/functions.js');
const { embedSmall } = require('../../helpers/voice.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('leave')
		.setDescription('Request bot to leave a voice channel.')
		.setDMPermission(true),
	async execute(interaction) {
		if (!process.env.VOICE_COMMANDS) {
			return interaction.reply('Voice commands are disabled.');
		}

		await interaction.deferReply();
		console.log(
			`-> New interaction: "${interaction.commandName}" by "${interaction.user.username}" on [${new Date().toString()}]`
		);

		const connection = getVoiceConnection(interaction.guild.id);

		if (!connection) {
			return await interaction.editReply(
				createWarningEmbed('The bot is not in any voice channel on this server')
			);
		}

		try {
			connection.destroy();
			await entersState(connection, VoiceConnectionStatus.Destroyed, 5_000);
			console.log('Bot left voice channel!');

			await interaction.editReply(embedSmall('Bot left voice channel'));
		} catch (error) {
			console.error(error);
			return await interaction.editReply(
				createErrorEmbed('Bot failed to left voice channel')
			);
		}

		return;
	},
};
