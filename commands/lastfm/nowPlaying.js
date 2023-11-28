const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('np')
		.setDescription('Replies with user now playing song!')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('The user (default you).')),
	async execute(interaction) {
		await interaction.deferReply();
		console.log('-> New interaction: "np"');
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

			await interaction.editReply('Creating and sending message...');
			const songEmbed = new EmbedBuilder()
				.setColor(0xC3000D)
				.setTitle(lastSong.recenttracks.track[0].name)
				.addFields(
					{ name: 'artist:', value: lastSong.recenttracks.track[0].artist['#text'], inline: true },
					// { name: 'album:', value: lastSong.recenttracks.track[0].album['#text'], inline: true },
				);

			// Check if album name exists
			if (lastSong.recenttracks.track[0].album['#text']) {
				songEmbed.addFields({ name: 'album:', value: lastSong.recenttracks.track[0].album['#text'], inline: true });
			}
			// Check if album cover url exists
			if (lastSong.recenttracks.track[0].image[3]['#text']) {
				songEmbed.setThumbnail(lastSong.recenttracks.track[0].image[3]['#text']);
			}

			if (lastSong.recenttracks.track[0]['@attr']) {
				if (lastSong.recenttracks.track[0]['@attr'].nowplaying) {
					songEmbed.setAuthor({ name: 'Now playing:', url: lastSong.recenttracks.track[0].url, iconURL: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpeg` });
					// songEmbed.setTimestamp();
				}
			} else {
				songEmbed.setAuthor({ name: 'Last song:', url: lastSong.recenttracks.track[0].url, iconURL: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpeg` });
			}

			await interaction.editReply({ content: '', embeds: [songEmbed] });

		} else {
			await interaction.editReply('Could not find user in a database. Use `lastfm nickname set` command to add your last.fm nickname to bot database');
			return;
		}
	},
};