const { SlashCommandBuilder } = require('discord.js');
const ytsr = require('ytsr');
require('dotenv').config();

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
		await interaction.editReply('Loading...');
		await interaction.editReply('Connecting with database...');
		const user = interaction.options.getUser('user') ?? interaction.user;

		const userdata = await interaction.client.Users.findOne({ where: { user: user.id } });

		if (userdata) {
			const fmlogin = userdata.get('lastfm');
			await interaction.editReply(`Fetching data from last.fm for user: \`${fmlogin}\`...`);

			const lastSong = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${fmlogin}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=1`).then((res) => res.json()).catch(error => { return error; });

			if (lastSong.error) {
				if (lastSong.error == 6) {
					await interaction.editReply(`Last.fm error response: User \`${fmlogin}\` not found 💀`);
				} else {
					await interaction.editReply('Unknown Last.fm API error 🔥');
				}
				return;
			}

			if (!lastSong.recenttracks) {
				return await interaction.editReply(`Unknown error for user: \`${fmlogin}\` ❌`);
			}

			if (!lastSong.recenttracks.track[0]) {
				return await interaction.editReply(`Unknown error for user: \`${fmlogin}\` ❌`);
			}

			await interaction.editReply('Searching song on youtube...');

			const query = `${lastSong.recenttracks.track[0].artist['#text']} - ${lastSong.recenttracks.track[0].name}`;
			const ytLink = await ytsr(query, { limit: 1 });

			return interaction.editReply(ytLink.items[0].url);

		} else {
			await interaction.editReply('Could not find user in a database. Use `lastfm nickname set` command to add your last.fm nickname to bot database');
			return;
		}
	},
};