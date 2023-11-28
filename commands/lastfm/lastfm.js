const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const validator = require('validator');
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
						.setDescription('The user (default you).'))),
	async execute(interaction) {

		switch (interaction.options.getSubcommandGroup()) {
			case 'nickname': {

				switch (interaction.options.getSubcommand()) {
					case 'set': {
						await interaction.deferReply();
						console.log('-> New interaction: "lastfm nickname set"');

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
						console.log('-> New interaction: "lastfm nickname remove"');
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
						console.log('-> New interaction: "lastfm nickname lock"');
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

			default: {
				switch (interaction.options.getSubcommand()) {
					case 'recent': {
						await interaction.deferReply();
						console.log('-> New interaction: "lastfm recent"');
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