const { SlashCommandBuilder } = require('discord.js');
const { VoiceConnectionStatus, entersState, getVoiceConnection } = require('@discordjs/voice');
const { playNextQueue, embedSmall } = require('../../helpers/voice.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('Skip to the next song in queue.')
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

		if (connection?.player && connection?.queue) {
			if (connection.queue.length === 0) {
				return await interaction.editReply(embedSmall('Queue is empty'));
			}
			playNextQueue(connection.player, connection.queue);
			return await interaction.editReply(embedSmall(':track_next: Skipping track'));
		}

		return await interaction.editReply(embedSmall(':x: Bot is not playing music right now'));
	},
};
