const { SlashCommandBuilder } = require('discord.js');
const { VoiceConnectionStatus, entersState, getVoiceConnection } = require('@discordjs/voice');
require('dotenv').config();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('leave')
		.setDescription('Request bot to leave a voice channel.')
		.setDMPermission(true),
	async execute(interaction) {
		// if (!process.env.VOICE_COMMANDS) {
		// 	return interaction.reply('Voice commands are disabled.');
		// }

		await interaction.deferReply();
		console.log(`-> New interaction: "${interaction.commandName}" by "${interaction.user.username}" on [${new Date().toString()}]`);

		const connection = getVoiceConnection(interaction.guild.id);

		connection.destroy();

		try {
			await entersState(connection, VoiceConnectionStatus.Destroyed, 5_000);
			console.log('Bot left voice channel!');
			await interaction.editReply('Bot left voice channel!');
		} catch (error) {
			console.error(error);
			await interaction.editReply('Bot failed to left voice channel!');
		}

		return;
	},
};