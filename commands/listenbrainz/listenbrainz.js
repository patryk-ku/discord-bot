const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const validator = require('validator');
require('dotenv').config();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('listenbrainz')
		.setDescription('Listenbrainz commands.')
		.addSubcommandGroup(subcommandgroup =>
			subcommandgroup
				.setName('nickname')
				.setDescription('Listenbrainz nickname options.')
				.addSubcommand(subcommand =>
					subcommand
						.setName('set')
						.setDescription('Set or update your listenbrainz nickname.')
						.addStringOption(option =>
							option.setName('nickname')
								.setDescription('Your listenbrainz nickname')
								.setRequired(true)))
				.addSubcommand(subcommand =>
					subcommand
						.setName('remove')
						.setDescription('Delete your listenbrainz nickname from bot database.')))
		.addSubcommand(subcommand =>
			subcommand
				.setName('np')
				.setDescription('Replies with user now playing song (from listenbrainz).')
				.addUserOption(option =>
					option.setName('user')
						.setDescription('The user (default you).'))),
	async execute(interaction) {

		if (!process.env.LISTENBRAINZ_TOKEN) {
			return interaction.reply('Listenbrainz commands are **disabled** because the bot owner did not provided an Listenbrainz API token.');
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
								listenbrainz: nickname,
							});

							return interaction.editReply(`Your listenbrainz login is set to: \`${row.listenbrainz}\``);
						} catch (error) {
							if (error.name === 'SequelizeUniqueConstraintError') {
								interaction.editReply('User exist in database, updating nickname.');
								const affectedRows = await interaction.client.Users.update({ listenbrainz: nickname }, { where: { user: interaction.user.id } });

								if (affectedRows > 0) {
									return interaction.editReply(`Your new listenbrainz nickname is \`${nickname}\`.`);
								}
							}

							console.log(error);
							return interaction.editReply('Error: Something went wrong with setting a listenbrainz username.');
						}
					}

					case 'remove': {
						await interaction.deferReply();
						console.log(`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommandGroup()} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`);
						await interaction.editReply('Deleting listenbrainz username from database...');

						// deletes user nickname from database
						const affectedRows = await interaction.client.Users.update({ listenbrainz: '' }, { where: { user: interaction.user.id } });

						if (affectedRows > 0) {
							return interaction.editReply('Listenbrainz nickname deleted.');

						}

						return interaction.editReply('That user doesn\'t exist in database.');
					}

					default: {
						return interaction.reply({ content: 'Error: Missing subcommand.', ephemeral: true });
					}
				}
			}

			default: {
				switch (interaction.options.getSubcommand()) {
					case 'np': {
						await interaction.deferReply();
						console.log(`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`);
						const user = interaction.options.getUser('user') ?? interaction.user;

						const userdata = await interaction.client.Users.findOne({ where: { user: user.id } });

						if (userdata) {
							if (!userdata.get('listenbrainz')) {
								return interaction.editReply(`Could not find ${user} listenbrainz nickname in a database. Use \`listenbrainz nickname set\` command to add your nickname to bot database.`);
							}

							const listenbrainzLogin = userdata.get('listenbrainz');

							// await interaction.editReply(`Fetching data from listenbrainz for user: \`${fmlogin}\`...`);

							const nowPlaying = await fetch(`https://api.listenbrainz.org/1/user/${listenbrainzLogin}/playing-now`, {
								method: 'GET',
								headers: {
									'Authorization': `Token ${process.env.LISTENBRAINZ_TOKEN}`,
								},
							}).then((res) => res.json()).catch(error => { return error; });

							if (nowPlaying.error) {
								console.log(nowPlaying);
								return interaction.editReply('Unknown listenbrainz API error 🔥');
							}

							if (!nowPlaying.payload) {
								return interaction.editReply('Unknown error for user');
							}

							if (nowPlaying.payload.count == 0) {
								return interaction.editReply(`${user} (\`${listenbrainzLogin}\`) is not listening to anything right now. 🔇`);
							}

							console.log(nowPlaying);
							console.log(nowPlaying.payload.listens);
							console.log(nowPlaying.payload.listens[0].track_metadata.additional_info);

							// await interaction.editReply('Creating and sending message...');

							let artwork;
							if (nowPlaying.payload.listens[0].track_metadata.additional_info.release_mbid) {
								artwork = await fetch(`http://coverartarchive.org/release/${nowPlaying.payload.listens[0].track_metadata.additional_info.release_mbid}/front-500`).then((res) => res.url).catch(error => { return error; });

								console.log(artwork);
							} else {
								artwork = { error: true };
								console.log('No mbid');
							}

							const songEmbed = new EmbedBuilder()
								// .setColor(0x362e6e)
								.setColor(0xbf458e)
								// .setTitle(nowPlaying.payload.listens[0].track_metadata.track_name)
								// .setTitle(`${nowPlaying.payload.listens[0].track_metadata.artist_name} - ${nowPlaying.payload.listens[0].track_metadata.track_name}`);
								.setFooter({ text: 'Listenbrainz' })
								.setTimestamp(new Date())
								.addFields(
									{ name: 'track', value: nowPlaying.payload.listens[0].track_metadata.track_name, inline: true },
									{ name: 'artist', value: nowPlaying.payload.listens[0].track_metadata.artist_name, inline: true },
									// { name: 'album:', value: '', inline: true },
								);

							// Check if album cover url exists
							if (!artwork.error) {
								songEmbed.setThumbnail(artwork);
							}

							if (nowPlaying.payload.playing_now) {
								songEmbed.setAuthor({ name: 'Now playing:', url: `https://musicbrainz.org/recording/${nowPlaying.payload.listens[0].track_metadata.additional_info.recording_mbid}`, iconURL: user.avatarURL() });
							} else {
								songEmbed.setAuthor({ name: 'Last song:', url: `https://musicbrainz.org/recording/${nowPlaying.payload.listens[0].track_metadata.additional_info.recording_mbid}`, iconURL: user.avatarURL() });
							}

							return interaction.editReply({ content: '', embeds: [songEmbed] });

						} else {
							return interaction.editReply(`Could not find ${user} in a database. Use \`listenbrainz nickname set\` command to add your listenbrainz nickname to bot database.`);
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