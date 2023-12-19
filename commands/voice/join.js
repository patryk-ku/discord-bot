const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
require('dotenv').config();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('Request bot to join a voice channel.')
		.addChannelOption(option =>
			option.setName('channel')
				.setDescription('The channel (default the one where you are now).')
				.addChannelTypes(ChannelType.GuildVoice))
		.setDMPermission(true),
	async execute(interaction) {
		// if (!process.env.VOICE_COMMANDS) {
		// 	return interaction.reply('Voice commands are disabled.');
		// }

		await interaction.deferReply();
		console.log(`-> New interaction: "${interaction.commandName}" by "${interaction.user.username}" on [${new Date().toString()}]`);
		const channel = interaction.options.getChannel('channel') ?? interaction.member.voice.channel;

		const connection = joinVoiceChannel({
			channelId: channel.id,
			guildId: interaction.guild.id,
			adapterCreator: interaction.guild.voiceAdapterCreator,
			selfDeaf: false,
		});

		try {
			await entersState(connection, VoiceConnectionStatus.Ready, 5_000);
			console.log('Bot joined voice channel!');
			await interaction.editReply(`Joined ${channel}.`);
		} catch (error) {
			console.error(error);
			await interaction.editReply(`Failed to join to ${channel}.`);
		}

		connection.on(VoiceConnectionStatus.Ready, (oldState, newState) => {
			console.log('Connection is in the Ready state!');
		});

		connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
			console.log('Connection problem, trying to reconnect...');
			try {
				await Promise.race([
					entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
					entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
				]);
				// Seems to be reconnecting to a new channel - ignore disconnect
			} catch (error) {
				// Seems to be a real disconnect which SHOULDN'T be recovered from
				console.log('Failed, disconnected...');
				connection.destroy();
			}
		});
	},
};