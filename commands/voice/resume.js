const { SlashCommandBuilder } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const { embedSmall } = require('../../helpers/voice.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('resume')
		.setDescription('Resume playback in voice channel.')
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

		if (connection?.player) {
			connection.player.unpause();
			return await interaction.editReply(embedSmall(':arrow_forward: Playback resumed'));
		}

		return await interaction.editReply(embedSmall(':x: Bot is not playing music right now'));
	},
};
