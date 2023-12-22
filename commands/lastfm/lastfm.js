const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const validator = require('validator');
const { request } = require('undici');
require('dotenv').config();
const Lastfm = require('../../helpers/lastfm');
const helperFunctions = require('../../helpers/functions');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs').promises;
const Sequelize = require('sequelize');
const querystring = require('querystring');

// Termux fix
let Canvas;
if (!process.env.TERMUX) {
	Canvas = require('@napi-rs/canvas');
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('lastfm')
		.setDescription('Last.fm options.')
		.addSubcommandGroup(subcommandgroup =>
			subcommandgroup
				.setName('nickname')
				.setDescription('Last.fm nickname options.')
				.addSubcommand(subcommand =>
					subcommand
						.setName('set')
						.setDescription('Set or update your lastfm nickname.')
						.addStringOption(option =>
							option.setName('nickname')
								.setDescription('Your lastfm nickname')
								.setRequired(true)))
				.addSubcommand(subcommand =>
					subcommand
						.setName('remove')
						.setDescription('Delete your lastfm nickname from bot database.'))
				.addSubcommand(subcommand =>
					subcommand
						.setName('lock')
						.setDescription('Prevent the server admins from changing your nickname.')
						.addBooleanOption(option =>
							option.setName('action')
								.setDescription('Lock - true or false.')
								.setRequired(true))))
		.addSubcommandGroup(subcommandgroup =>
			subcommandgroup
				.setName('top')
				.setDescription('Last.fm user top charts.')
				.addSubcommand(subcommand =>
					subcommand
						.setName('artists')
						.setDescription('Replies with user top artists chart.')
						.addStringOption(option =>
							option.setName('range')
								.setDescription('Date range.')
								.setRequired(true)
								.addChoices(
									{ name: 'week', value: '7day' },
									{ name: 'month', value: '1month' },
									{ name: 'year', value: '12month' },
									{ name: 'overall', value: 'overall' },
								))
						.addIntegerOption(option =>
							option.setName('amount')
								.setDescription('Number of artists (default 10, max 20).')
								.setMinValue(1)
								.setMaxValue(20))
						.addUserOption(option =>
							option.setName('user')
								.setDescription('The user (default you).')))
				.addSubcommand(subcommand =>
					subcommand
						.setName('albums')
						.setDescription('Replies with user top albums chart.')
						.addStringOption(option =>
							option.setName('range')
								.setDescription('Date range.')
								.setRequired(true)
								.addChoices(
									{ name: 'week', value: '7day' },
									{ name: 'month', value: '1month' },
									{ name: 'year', value: '12month' },
									{ name: 'overall', value: 'overall' },
								))
						.addIntegerOption(option =>
							option.setName('amount')
								.setDescription('Number of albums (default 10, max 20).')
								.setMinValue(1)
								.setMaxValue(20))
						.addUserOption(option =>
							option.setName('user')
								.setDescription('The user (default you).')))
				.addSubcommand(subcommand =>
					subcommand
						.setName('tracks')
						.setDescription('Replies with user top tracks chart.')
						.addStringOption(option =>
							option.setName('range')
								.setDescription('Date range.')
								.setRequired(true)
								.addChoices(
									{ name: 'week', value: '7day' },
									{ name: 'month', value: '1month' },
									{ name: 'year', value: '12month' },
									{ name: 'overall', value: 'overall' },
								))
						.addIntegerOption(option =>
							option.setName('amount')
								.setDescription('Number of tracks (default 10, max 20).')
								.setMinValue(1)
								.setMaxValue(20))
						.addUserOption(option =>
							option.setName('user')
								.setDescription('The user (default you).'))))
		.addSubcommandGroup(subcommandgroup =>
			subcommandgroup
				.setName('server')
				.setDescription('Last.fm server stats options.')
				.addSubcommand(subcommand =>
					subcommand
						.setName('artist')
						.setDescription('Check artist playcount for each member of the server (max 20 users)')
						.addStringOption(option =>
							option.setName('artist')
								.setDescription('Artist name (default your now playing/last artist).'))
						.addUserOption(option =>
							option.setName('user')
								.setDescription('The user (default you).'))))
		.addSubcommand(subcommand =>
			subcommand
				.setName('recent')
				.setDescription('Replies with user recently scrobbled songs.')
				.addIntegerOption(option =>
					option.setName('amount')
						.setDescription('Number of songs (default 5, max 10).')
						.setMinValue(1)
						.setMaxValue(10))
				.addUserOption(option =>
					option.setName('user')
						.setDescription('The user (default you).')))
		.addSubcommand(subcommand =>
			subcommand
				.setName('collage')
				.setDescription('Replies with user top albums collage.')
				.addStringOption(option =>
					option.setName('range')
						.setDescription('Date range.')
						.setRequired(true)
						.addChoices(
							{ name: 'week', value: '7day' },
							{ name: 'month', value: '1month' },
							{ name: 'year', value: '12month' },
							{ name: 'overall', value: 'overall' },
						))
				.addUserOption(option =>
					option.setName('user')
						.setDescription('The user (default you).')))
		.addSubcommand(subcommand =>
			subcommand
				.setName('profile')
				.setDescription('Replies with user last.fm profile summary.')
				.addUserOption(option =>
					option.setName('user')
						.setDescription('The user (default you).')))
		.setDMPermission(true),
	async execute(interaction) {
		if (!process.env.LASTFM_API_KEY) {
			return interaction.reply(Lastfm.msg.apiDisabled());
		}

		switch (interaction.options.getSubcommandGroup()) {
			case 'nickname': {

				switch (interaction.options.getSubcommand()) {
					case 'set': {
						await interaction.deferReply();
						console.log(`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommandGroup()} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`);

						const nickname = validator.escape(interaction.options.getString('nickname'));
						await interaction.editReply(`Setting your nickname to: \`${nickname}\``);

						try {
							const row = await interaction.client.Users.create({
								user: interaction.user.id,
								lastfm: nickname,
							});

							return interaction.editReply(`Your lastfm login is set to: \`${row.lastfm}\``);
						} catch (error) {
							if (error.name === 'SequelizeUniqueConstraintError') {
								interaction.editReply('User exist in database, updating nickname.');
								const affectedRows = await interaction.client.Users.update({ lastfm: nickname }, { where: { user: interaction.user.id } });

								if (affectedRows > 0) {
									return interaction.editReply(`Your new nickname is \`${nickname}\`.`);
								}
							}

							console.log(error);
							return interaction.editReply('Error: Something went wrong with setting a username.');
						}
					}

					case 'remove': {
						await interaction.deferReply();
						console.log(`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommandGroup()} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`);
						await interaction.editReply('Deleting your last.fm username from database...');

						// deletes user nickname from database
						const affectedRows = await interaction.client.Users.update({ lastfm: '' }, { where: { user: interaction.user.id } });

						if (affectedRows > 0) {
							return interaction.editReply('User deleted.');
						}

						return interaction.editReply('That user doesn\'t exist in database.');

					}

					case 'lock': {
						await interaction.deferReply({ ephemeral: true });
						console.log(`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommandGroup()} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`);
						const lock = interaction.options.getBoolean('action');

						const affectedRows = await interaction.client.Users.update({ locked: lock }, { where: { user: interaction.user.id } });

						if (affectedRows > 0) {
							return interaction.editReply({ content: `Your nickname lock status is set to: \`${lock}\`.`, ephemeral: true });
						} else {
							return interaction.editReply({ content: 'That user doesn\'t exist in database.', ephemeral: true });
						}

					}

					default: {
						return interaction.reply({ content: 'Error: Missing subcommand.', ephemeral: true });
					}
				}
			}

			case 'top': {
				switch (interaction.options.getSubcommand()) {
					case 'artists': {
						await interaction.deferReply();
						console.log(`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommandGroup()} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`);

						const user = interaction.options.getUser('user') ?? interaction.user;
						const range = interaction.options.getString('range');
						const amount = interaction.options.getInteger('amount') ?? 10;

						// Get user nickname from bot database
						const userData = await interaction.client.Users.findOne({ where: { user: user.id } });
						if (!userData) {
							return interaction.editReply(Lastfm.msg.missingUsername(user));
						}
						if (!userData.get('lastfm')) {
							return interaction.editReply(Lastfm.msg.missingUsername(user));
						}
						const lastfmNickname = userData.get('lastfm');

						// Get top artists
						const artists = await Lastfm.getTopArtists(user, lastfmNickname, range, amount);
						if (artists.error) {
							return interaction.editReply({ content: artists.error });
						}

						const rangeString = Lastfm.str.range(range);
						const artistEmbed = new EmbedBuilder()
							.setColor(0xC3000D)
							.setAuthor({ name: `${user.username} top artists of the ${rangeString}:`, iconURL: user.avatarURL() })
							.setFooter({ text: `total ${artists['@attr'].total} artist played (${rangeString})` });

						let descriptionString = '';
						for (const [index, artist] of artists.artist.entries()) {
							descriptionString += `\n${index + 1}. [**${artist.name}**](${artist.url}) - **${artist.playcount}** *plays*`;
						}
						artistEmbed.setDescription(descriptionString);

						return interaction.editReply({ content: '', embeds: [artistEmbed] });
					}

					case 'albums': {
						await interaction.deferReply();
						console.log(`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommandGroup()} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`);

						const user = interaction.options.getUser('user') ?? interaction.user;
						const range = interaction.options.getString('range');
						const amount = interaction.options.getInteger('amount') ?? 10;

						// Get user nickname from bot database
						const userData = await interaction.client.Users.findOne({ where: { user: user.id } });
						if (!userData) {
							return interaction.editReply(Lastfm.msg.missingUsername(user));
						}
						if (!userData.get('lastfm')) {
							return interaction.editReply(Lastfm.msg.missingUsername(user));
						}
						const lastfmNickname = userData.get('lastfm');

						// Get top albums
						const albums = await Lastfm.getTopAlbums(user, lastfmNickname, range, amount);
						if (albums.error) {
							return interaction.editReply({ content: albums.error });
						}

						const rangeString = Lastfm.str.range(range);
						const albumEmbed = new EmbedBuilder()
							.setColor(0xC3000D)
							.setAuthor({ name: `${user.username} top albums of the ${rangeString}:`, iconURL: user.avatarURL() })
							.setFooter({ text: `total ${albums['@attr'].total} albums played (${rangeString})` });

						let descriptionString = '';
						for (const [index, album] of albums.album.entries()) {
							descriptionString += `\n${index + 1}. **${album.artist.name}** - [**${album.name}**](${album.url}) - **${album.playcount}** *plays*`;
						}
						albumEmbed.setDescription(descriptionString);

						return interaction.editReply({ content: '', embeds: [albumEmbed] });
					}

					case 'tracks': {
						await interaction.deferReply();
						console.log(`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommandGroup()} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`);

						const user = interaction.options.getUser('user') ?? interaction.user;
						const range = interaction.options.getString('range');
						const amount = interaction.options.getInteger('amount') ?? 10;

						// Get user nickname from bot database
						const userData = await interaction.client.Users.findOne({ where: { user: user.id } });
						if (!userData) {
							return interaction.editReply(Lastfm.msg.missingUsername(user));
						}
						if (!userData.get('lastfm')) {
							return interaction.editReply(Lastfm.msg.missingUsername(user));
						}
						const lastfmNickname = userData.get('lastfm');

						// Get top tracks
						const tracks = await Lastfm.getTopTracks(user, lastfmNickname, range, amount);
						if (tracks.error) {
							return interaction.editReply({ content: tracks.error });
						}

						const rangeString = Lastfm.str.range(range);
						const trackEmbed = new EmbedBuilder()
							.setColor(0xC3000D)
							.setAuthor({ name: `${user.username} top tracks of the ${rangeString}:`, iconURL: user.avatarURL() })
							.setFooter({ text: `total ${tracks['@attr'].total} tracks played (${rangeString})` });

						let descriptionString = '';
						for (const [index, track] of tracks.track.entries()) {
							descriptionString += `\n${index + 1}. **${track.artist.name}** - [**${track.name}**](${track.url}) - **${track.playcount}** *plays*`;
						}
						trackEmbed.setDescription(descriptionString);

						return interaction.editReply({ content: '', embeds: [trackEmbed] });
					}

					default: {
						return interaction.reply({ content: 'Error: Missing subcommand.', ephemeral: true });
					}
				}
			}

			case 'server': {
				switch (interaction.options.getSubcommand()) {
					case 'artist': {
						await interaction.deferReply();
						console.log(`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommandGroup()} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`);
						const user = interaction.options.getUser('user') ?? interaction.user;
						let artist = interaction.options.getString('artist');

						if (!artist) {
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

							artist = nowPlaying.track[0].artist['#text'];
						}

						// Get all logged server users
						const members = await interaction.guild.members.fetch();
						const membersIds = members.map(member => member.user.id);
						const loggedUsers = await interaction.client.Users.findAll({ where: { user: { [Sequelize.Op.in]: membersIds } } });

						const promises = [];
						for (let i = 0; i < loggedUsers.length; i++) {
							const data = Lastfm.getArtistScrobble(await interaction.client.users.fetch(loggedUsers[i].dataValues.user), loggedUsers[i].dataValues.lastfm, artist);
							promises.push(data);
						}

						const artistScrobbles = await Promise.all(promises).catch((error) => {
							console.error(error);
							return interaction.editReply(Lastfm.msg.unknownApiError(error));
						});

						const artistsForEmbed = [];
						for (let i = 0; i < artistScrobbles.length; i++) {
							if (!artistScrobbles[i].error) {
								artistsForEmbed.push(artistScrobbles[i]);
							}
						}

						if (artistsForEmbed.length == 0) {
							return interaction.editReply(`Nobody on this server listens to **${artist}**.`);
						}

						artistsForEmbed.sort((a, b) => b.playcount - a.playcount);

						const artistEmbed = new EmbedBuilder()
							.setColor(0xC3000D)
							.setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() });

						let descriptionString = `### [${artist}](https://www.last.fm/music/${querystring.escape(artist)}) - listeners:`;
						for (let i = 0; i < artistsForEmbed.length; i++) {
							descriptionString += `\n${i + 1}. **${artistsForEmbed[i].user}** - **${artistsForEmbed[i].playcount}** *plays*`;
						}
						artistEmbed.setDescription(descriptionString);

						return interaction.editReply({ content: '', embeds: [artistEmbed] });
					}

					default: {
						return interaction.reply({ content: 'Error: Missing subcommand.', ephemeral: true });
					}
				}
			}

			default: {
				switch (interaction.options.getSubcommand()) {
					case 'collage': {
						await interaction.deferReply();
						console.log(`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`);
						const user = interaction.options.getUser('user') ?? interaction.user;
						const range = interaction.options.getString('range');

						// Get user nickname from bot database
						const userData = await interaction.client.Users.findOne({ where: { user: user.id } });
						if (!userData) {
							return interaction.editReply(Lastfm.msg.missingUsername(user));
						}
						if (!userData.get('lastfm')) {
							return interaction.editReply(Lastfm.msg.missingUsername(user));
						}
						const lastfmNickname = userData.get('lastfm');

						// Get top albums
						const albums = await Lastfm.getTopAlbums(user, lastfmNickname, range, 9);
						if (albums.error) {
							return interaction.editReply({ content: albums.error });
						}

						const rangeString = Lastfm.str.range(range);
						if (!process.env.TERMUX) {

							// Create canvas image
							const canvas = Canvas.createCanvas(900, 900);
							const context = canvas.getContext('2d');
							let missingCounter = 9;

							let x = 0, y = 0;
							for (const album of albums.album) {
								if (album.image[3]['#text'].length > 0) {
									const { body } = await request(album.image[3]['#text']);
									const cover = await Canvas.loadImage(await body.arrayBuffer());
									context.drawImage(cover, x, y, 300, 300);
									missingCounter--;
								}

								x += 300;
								if (x == 900) {
									x = 0;
									y += 300;
								}
							}

							let collageString = `##  ${user} top albums of the ${rangeString}:`;

							if (missingCounter > 0) {
								collageString += `\n*Missing covers: ${missingCounter}*`;
							}

							const attachment = new AttachmentBuilder(await canvas.encode('jpeg'), { name: 'collage.jpeg' });
							return interaction.editReply({ content: collageString, files: [attachment] });
						}

						// Termux fix
						const fileId = String(Date.now());
						const requests = [];
						const filePaths = [];
						let missingCounter = 9;

						// Async download all covers
						for (const [index, album] of albums.album.entries()) {
							if (album.image[3]['#text'].length > 0) {
								console.log(`Downloading: ${album.image[3]['#text']}`);
								const fileName = `./tmpfiles/${fileId}-${index}.jpg`;
								filePaths.push(fileName);
								const coverArt = helperFunctions.downloadFile(album.image[3]['#text'], fileName);
								requests.push(coverArt);
								missingCounter--;
							}
						}

						try {
							await Promise.all(requests);
							console.log('All files downloaded.');
						} catch (error) {
							helperFunctions.deleteMultipleFiles(filePaths);
							return interaction.editReply({ content: 'Failed to download one or more images from Last.fm servers, try again later.' });
						}

						// Use python script to create collage
						try {
							const { error, stdout, stderr } = await execPromise(`python ./helpers/collage.py ${fileId}`);
							if (error) {
								console.log(error);
							}
							if (stderr) {
								console.log(stderr);
							}
							console.log(stdout);
						} catch (error) {
							console.log(`error: ${error}`);
							helperFunctions.deleteMultipleFiles(filePaths);
							return interaction.editReply('Failed to create collage.');
						}

						// Check if file exists
						try {
							await fs.access(`./tmpfiles/${fileId}-collage.jpg`, fs.constants.F_OK);
						} catch (error) {
							console.log('Collage file don\'t exists.');
							helperFunctions.deleteMultipleFiles(filePaths);
							return interaction.editReply('Failed to create collage.');
						}

						filePaths.push(`./tmpfiles/${fileId}-collage.jpg`);
						console.log('Collage is ready.');

						// Uploading file to discord
						let collageString = `##  ${user} top albums of the ${rangeString}:`;

						if (missingCounter > 0) {
							collageString += `\n*Missing covers: ${missingCounter}*`;
						}

						try {
							const attachment = new AttachmentBuilder(filePaths.at(-1));
							await interaction.editReply({ content: collageString, files: [attachment] });
							console.log('File sent.');
						} catch (error) {
							console.log(error);
							await interaction.editReply('Error, failed to upload video to discord servers.');
						}

						// Deleting tmp files
						helperFunctions.deleteMultipleFiles(filePaths);
						return;
					}

					case 'recent': {
						await interaction.deferReply();
						console.log(`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`);
						const user = interaction.options.getUser('user') ?? interaction.user;
						const amount = interaction.options.getInteger('amount') ?? 5;

						// Get user nickname from bot database
						const userData = await interaction.client.Users.findOne({ where: { user: user.id } });
						if (!userData) {
							return interaction.editReply(Lastfm.msg.missingUsername(user));
						}
						if (!userData.get('lastfm')) {
							return interaction.editReply(Lastfm.msg.missingUsername(user));
						}
						const lastfmNickname = userData.get('lastfm');

						// Get recent tracks
						const recentTracks = await Lastfm.getRecentTracks(user, lastfmNickname, amount);
						if (recentTracks.error) {
							return interaction.editReply({ content: recentTracks.error });
						}

						const multiEmbedd = [];

						for (const song of recentTracks.track) {

							if (song['@attr']) {
								if (song['@attr'].nowplaying) {
									continue;
								}
							}

							const songEmbed = new EmbedBuilder()
								.setColor(0xC3000D)
								.setTimestamp(new Date(song.date.uts * 1000));

							// Check if album cover url exists
							if (song.image[3]['#text']) {
								songEmbed.setAuthor({ name: `${song.artist['#text']} - ${song.name}`, iconURL: song.image[3]['#text'] });
							} else {
								songEmbed.setAuthor({ name: `${song.artist['#text']} - ${song.name}` });
							}

							multiEmbedd.push(songEmbed);
						}

						return await interaction.editReply({ content: `## ${user} recent ${amount} songs:`, embeds: [...multiEmbedd] });
					}

					case 'profile': {
						await interaction.deferReply();
						console.log(`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`);
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

						// Get profile info
						const profile = await Lastfm.getUserInfo(user, lastfmNickname);
						if (profile.error) {
							return interaction.editReply({ content: profile.error });
						}

						const profileEmbed = new EmbedBuilder()
							.setColor(0xC3000D)
							.setAuthor({ name: `${user.username} last.fm profile:`, iconURL: user.avatarURL(), url: profile.url })
							.setThumbnail(profile.image[3]['#text'])
							.addFields(
								{ name: 'Nickname', value: profile.name, inline: true },
								{ name: 'Scrobbles', value: profile.playcount, inline: true },
							)
							.setFooter({ text: 'Scrobbling since' })
							.setTimestamp(new Date(profile.registered.unixtime * 1000));

						if (profile.country) {
							if (profile.country != 'None' && profile.country.length > 0) {
								profileEmbed.addFields(
									// { name: '\u200B', value: 'Other:' },
									{ name: 'Country', value: profile.country },
								);
							}
						}

						profileEmbed.addFields(
							{ name: '\u200B', value: 'Total count:' },
							{ name: 'Tracks', value: profile.track_count, inline: true },
							{ name: 'Albums', value: profile.album_count, inline: true },
							{ name: 'Artists', value: profile.artist_count, inline: true },
						);

						return interaction.editReply({ content: '', embeds: [profileEmbed] });
					}

					default: {
						return interaction.reply({ content: 'Error: Missing subcommand.', ephemeral: true });
					}
				}
			}
		}
	},
};