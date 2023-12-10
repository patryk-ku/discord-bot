const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, userMention } = require('discord.js');
const validator = require('validator');
const Canvas = require('@napi-rs/canvas');
const { request } = require('undici');
require('dotenv').config();

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
						.setDescription('The user (default you).'))),
	async execute(interaction) {

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

						// deletes user from database
						const rowCount = await interaction.client.Users.destroy({ where: { user: interaction.user.id } });

						if (!rowCount) {
							return interaction.editReply('That user doesn\'t exist in database.');
						}

						return interaction.editReply('User deleted.');
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
						const amount = interaction.options.getInteger('amount') ?? 5;
						break;
					}

					case 'albums': {
						await interaction.deferReply();
						console.log(`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommandGroup()} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`);

						const user = interaction.options.getUser('user') ?? interaction.user;
						const range = interaction.options.getString('range');
						const amount = interaction.options.getInteger('amount') ?? 10;

						const userData = await interaction.client.Users.findOne({ where: { user: user.id } });
						if (userData) {
							const lastfmLogin = userData.get('lastfm');

							const albums = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${lastfmLogin}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=${amount}&period=${range}`).then((res) => res.json()).catch(error => { return error; });

							if (albums.error) {
								if (albums.error == 6) {
									await interaction.editReply(`Last.fm error response: User \`${lastfmLogin}\` not found 💀`);
								} else {
									await interaction.editReply('Unknown Last.fm API error 🔥');
								}
								return;
							}

							if (!albums.topalbums) {
								return await interaction.editReply(`Unknown error for user: \`${lastfmLogin}\` ❌`);
							}

							if (!albums.topalbums.album[0]) {
								return await interaction.editReply(`No recent tracks for user: \`${lastfmLogin}\` ❌`);
							}

							if (albums.topalbums.album == 0) {
								return await interaction.editReply(`No recent tracks for user: \`${lastfmLogin}\` ❌`);
							}

							let rangeString = '';
							if (range == '7day') {
								rangeString = 'week';
							} else if (range == '1month') {
								rangeString = 'month';
							} else if (range == '12month') {
								rangeString = 'year';
							} else if (range == 'overall') {
								rangeString = 'all time';
							}

							const albumEmbed = new EmbedBuilder()
								.setColor(0xC3000D)
								.setAuthor({ name: `${user.username} top albums of the ${rangeString}:`, iconURL: user.avatarURL() })
								.setFooter({ text: `total ${albums.topalbums['@attr'].total} albums played (${rangeString})` });

							let descriptionString = '';

							for (const [index, album] of albums.topalbums.album.entries()) {

								descriptionString += `\n${index + 1}. **${album.artist.name}** - [**${album.name}**](${album.url}) - (**${album.playcount}** *plays*)`;
							}

							albumEmbed.setDescription(descriptionString);

							return interaction.editReply({ content: '', embeds: [albumEmbed] });


						} else {
							return interaction.editReply('Could not find user in a database. Use `lastfm nickname set` command to add your last.fm nickname to bot database');
						}
					}

					case 'tracks': {
						await interaction.deferReply();
						console.log(`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommandGroup()} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`);

						const user = interaction.options.getUser('user') ?? interaction.user;
						const range = interaction.options.getString('range');
						const amount = interaction.options.getInteger('amount') ?? 5;
						break;
					}

					default: {
						return interaction.reply({ content: 'Error: Missing subcommand.', ephemeral: true });
					}
				}
				break;
			}

			default: {
				switch (interaction.options.getSubcommand()) {
					case 'collage': {
						await interaction.deferReply();
						console.log(`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`);
						const user = interaction.options.getUser('user') ?? interaction.user;
						const range = interaction.options.getString('range');

						const userData = await interaction.client.Users.findOne({ where: { user: user.id } });
						if (userData) {
							const lastfmLogin = userData.get('lastfm');

							const albums = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${lastfmLogin}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=9&period=${range}`).then((res) => res.json()).catch(error => { return error; });

							if (albums.error) {
								if (albums.error == 6) {
									await interaction.editReply(`Last.fm error response: User \`${lastfmLogin}\` not found 💀`);
								} else {
									await interaction.editReply('Unknown Last.fm API error 🔥');
								}
								return;
							}

							// console.log(albums);

							if (!albums.topalbums) {
								return await interaction.editReply(`Unknown error for user: \`${lastfmLogin}\` ❌`);
							}

							if (!albums.topalbums.album[0]) {
								return await interaction.editReply(`No recent tracks for user: \`${lastfmLogin}\` ❌`);
							}

							if (albums.topalbums.album == 0) {
								return await interaction.editReply(`No recent tracks for user: \`${lastfmLogin}\` ❌`);
							}

							const canvas = Canvas.createCanvas(900, 900);
							const context = canvas.getContext('2d');

							let x = 0, y = 0;
							for (const album of albums.topalbums.album) {

								// console.log(album.image[3]['#text']);
								// console.log(`${x}:${y}`);

								if (album.image[3]['#text'].length > 0) {
									const { body } = await request(album.image[3]['#text']);
									const cover = await Canvas.loadImage(await body.arrayBuffer());
									context.drawImage(cover, x, y, 300, 300);
								} else {
									// context.fillRect(x, y, 300, 300);
								}

								x += 300;
								if (x == 900) {
									x = 0;
									y += 300;
								}
							}

							let rangeString = '';
							if (range == '7day') {
								rangeString = 'week';
							} else if (range == '1month') {
								rangeString = 'month';
							} else if (range == '12month') {
								rangeString = 'year';
							} else if (range == 'overall') {
								rangeString = 'all time';
							}

							const attachment = new AttachmentBuilder(await canvas.encode('jpeg'), { name: 'collage.jpeg' });
							return interaction.editReply({ content: `## \`${lastfmLogin}\` top albums of the ${rangeString}:`, files: [attachment] });


						} else {
							return interaction.editReply('Could not find user in a database. Use `lastfm nickname set` command to add your last.fm nickname to bot database');
						}
					}

					case 'recent': {
						await interaction.deferReply();
						console.log(`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`);
						const user = interaction.options.getUser('user') ?? interaction.user;
						const amount = interaction.options.getInteger('amount') ?? 5;

						const userData = await interaction.client.Users.findOne({ where: { user: user.id } });
						if (userData) {
							const lastfmLogin = userData.get('lastfm');
							// await interaction.editReply(`Fetching data from last.fm for user: \`${lastfmLogin}\`...`);

							const recentSongs = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${lastfmLogin}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=${amount}`).then((res) => res.json()).catch(error => { return error; });

							if (recentSongs.error) {
								if (recentSongs.error == 6) {
									await interaction.editReply(`Last.fm error response: User \`${lastfmLogin}\` not found 💀`);
								} else {
									await interaction.editReply('Unknown Last.fm API error 🔥');
								}
								return;
							}

							if (!recentSongs.recenttracks) {
								return await interaction.editReply(`Unknown error for user: \`${lastfmLogin}\` ❌`);
							}

							if (!recentSongs.recenttracks.track[0]) {
								return await interaction.editReply(`No recent tracks for user: \`${lastfmLogin}\` ❌`);
							}

							if (recentSongs.recenttracks.track.length == 0) {
								return await interaction.editReply(`No recent tracks for user: \`${lastfmLogin}\` ❌`);
							}

							const multiEmbedd = [];

							for (const song of recentSongs.recenttracks.track) {

								if (song['@attr']) {
									if (song['@attr'].nowplaying) {
										continue;
									}
								}

								const songEmbed = new EmbedBuilder()
									.setColor(0xC3000D);

								// Check if album cover url exists
								if (song.image[3]['#text']) {
									songEmbed.setAuthor({ name: `${song.name}  -  ${song.artist['#text']}`, iconURL: song.image[3]['#text'] });
								} else {
									songEmbed.setAuthor({ name: `${song.name}  -  ${song.artist['#text']}` });
								}

								multiEmbedd.push(songEmbed);
							}

							return await interaction.editReply({ content: `## \`${lastfmLogin}\` recent ${amount} songs:`, embeds: [...multiEmbedd] });

						} else {
							return await interaction.editReply('Could not find user in a database. Use `lastfm nickname set` command to add your last.fm nickname to bot database');
						}
					}

					default: {
						return interaction.reply({ content: 'Error: Missing subcommand.', ephemeral: true });
					}
				}
			}
		}
	},
};