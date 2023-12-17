const { SlashCommandBuilder } = require('discord.js');
const validator = require('validator');
require('dotenv').config();
const Listenbrainz = require('../../helpers/listenbrainz');

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
						.setDescription('The user (default you).')))
		.addSubcommand(subcommand =>
			subcommand
				.setName('cover')
				.setDescription('Replies with high-res cover art of user now playing song (from listenbrainz).')
				.addUserOption(option =>
					option.setName('user')
						.setDescription('The user (default you).')))
		.setDMPermission(true),
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

						// Get user nickname from bot database
						const userData = await interaction.client.Users.findOne({ where: { user: user.id } });
						if (!userData) {
							return interaction.editReply(Listenbrainz.msg.missingUsername(user));
						}
						if (!userData.get('listenbrainz')) {
							return interaction.editReply(Listenbrainz.msg.missingUsername(user));
						}
						const listenbrainzNickname = userData.get('listenbrainz');

						// Create now playing embed
						const songEmbed = await Listenbrainz.embedNowPlaying(user, listenbrainzNickname);
						if (songEmbed.error) {
							return interaction.editReply({ content: songEmbed.error });
						}

						return interaction.editReply({ content: '', embeds: [songEmbed] });
					}

					case 'cover': {
						await interaction.deferReply();
						console.log(`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`);
						const user = interaction.options.getUser('user') ?? interaction.user;

						// Get user nickname from bot database
						const userData = await interaction.client.Users.findOne({ where: { user: user.id } });
						if (!userData) {
							return interaction.editReply(Listenbrainz.msg.missingUsername(user));
						}
						if (!userData.get('listenbrainz')) {
							return interaction.editReply(Listenbrainz.msg.missingUsername(user));
						}
						const listenbrainzNickname = userData.get('listenbrainz');

						// Get now playing song
						const nowPlaying = await Listenbrainz.getNowPlaying(user, listenbrainzNickname);
						if (nowPlaying.error) {
							return interaction.editReply({ content: nowPlaying.error });
						}

						// Checking if mbid of release exists
						if (!nowPlaying.payload.listens[0].track_metadata.additional_info.release_mbid) {
							return interaction.editReply({ content: 'The `mbid` of this track is missing in MusicBrainz database. Unable to fetch cover art image for this release.' });
						}
						const mbid = nowPlaying.payload.listens[0].track_metadata.additional_info.release_mbid;

						// Fetching image
						const coverArt = await Listenbrainz.getCoverArt(mbid, 9999);
						if (coverArt.error) {
							return interaction.editReply({ content: coverArt.error });
						}

						return interaction.editReply({ content: coverArt });
					}

					default: {
						return interaction.reply({ content: 'Error: Missing subcommand.', ephemeral: true });
					}
				}
			}
		}
	},
};