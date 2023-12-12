const { SlashCommandBuilder } = require('discord.js');
const ytsr = require('ytsr');
require('dotenv').config();
const Lastfm = require('../../helpers/lastfm');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('yt')
		.setDescription('Replies with yt search of user now playing song.')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('The user (default you).')),
	async execute(interaction) {
		await interaction.deferReply();
		console.log(`-> New interaction: "${interaction.commandName}" by "${interaction.user.username}" on [${new Date().toString()}]`);
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

		const query = `${nowPlaying.track[0].artist['#text']} - ${nowPlaying.track[0].name}`;
		const ytLink = await ytsr(query, { limit: 1 });

		return interaction.editReply(ytLink.items[0].url);
	},
};