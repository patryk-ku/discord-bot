const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
require('dotenv').config();
const Lastfm = require('../../helpers/lastfm');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('np')
		.setDescription('Replies with user now playing song!')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('The user (default you).')),
	async execute(interaction) {
		await interaction.deferReply();
		console.log(`-> New interaction: "${interaction.commandName}" by "${interaction.user.username}" on [${new Date().toString()}]`);
		// await interaction.editReply('Loading...');
		// await interaction.editReply('Connecting with database...');
		const user = interaction.options.getUser('user') ?? interaction.user;

		// Get user nickname from bot database
		const userData = await interaction.client.Users.findOne({ where: { user: user.id } });
		if (!userData) {
			return interaction.editReply(Lastfm.msg.missingUsername(user));
		}
		if (!userData.get('lastfm')) {
			return interaction.editReply(Lastfm.msg.missingUsername(user));
		}
		const lastfmNickname = userData.get('lastfm');

		// Get now playing song
		const nowPlaying = await Lastfm.getNowPlaying(user, lastfmNickname);
		if (nowPlaying.error) {
			return interaction.editReply({ content: nowPlaying.error });
		}

		const songEmbed = new EmbedBuilder()
			.setColor(0xC3000D)
			.setTitle(nowPlaying.track[0].name)
			.addFields(
				{ name: 'artist:', value: nowPlaying.track[0].artist['#text'], inline: true },
			);

		// Check if album name exists
		if (nowPlaying.track[0].album['#text']) {
			songEmbed.addFields({ name: 'album:', value: nowPlaying.track[0].album['#text'], inline: true });
		}
		// Check if album cover url exists
		if (nowPlaying.track[0].image[3]['#text']) {
			songEmbed.setThumbnail(nowPlaying.track[0].image[3]['#text']);
		}

		if (nowPlaying.track[0]['@attr']) {
			if (nowPlaying.track[0]['@attr'].nowplaying) {
				songEmbed.setAuthor({ name: 'Now playing:', url: nowPlaying.track[0].url, iconURL: user.avatarURL() });
				songEmbed.setFooter({ text: 'Last.fm' });
				songEmbed.setTimestamp(new Date());
			}
		} else {
			songEmbed.setAuthor({ name: 'Last song:', url: nowPlaying.track[0].url, iconURL: user.avatarURL() });
		}

		await interaction.editReply({ content: '', embeds: [songEmbed] });
	},
};