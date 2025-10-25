const { SlashCommandBuilder } = require('discord.js');
const validator = require('validator');
const Sequelize = require('sequelize');
const Lol = require('../../helpers/lol');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('admin')
		.setDescription('Administrator options. You can edit other users settings here etc.')
		.addSubcommandGroup((subcommandgroup) =>
			subcommandgroup
				.setName('lastfm')
				.setDescription('Last.fm options.')
				.addSubcommand((subcommand) =>
					subcommand
						.setName('set')
						.setDescription('Set or update anyone last.fm nickname.')
						.addUserOption((option) =>
							option.setName('user').setDescription('The user.').setRequired(true)
						)
						.addStringOption((option) =>
							option
								.setName('nickname')
								.setDescription('Last.fm nickname.')
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('remove')
						.setDescription('Delete any user lastfm nickname from bot database.')
						.addUserOption((option) =>
							option.setName('user').setDescription('The user.').setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('users')
						.setDescription('List all last.fm users from this server.')
				)
		)
		.addSubcommandGroup((subcommandgroup) =>
			subcommandgroup
				.setName('lol')
				.setDescription('League of Legends options.')
				.addSubcommand((subcommand) =>
					subcommand
						.setName('set')
						.setDescription('Set or update anyone lol nickname.')
						.addUserOption((option) =>
							option.setName('user').setDescription('The user.').setRequired(true)
						)
						.addStringOption((option) =>
							option
								.setName('nickname')
								.setDescription(
									'League of Legends nickname with tag (Nickname#TAG)'
								)
								.setRequired(true)
						)
						.addStringOption((option) =>
							option
								.setName('region')
								.setDescription('User League of Legends region.')
								.addChoices(
									{ name: 'EUNE', value: 'eun1' },
									{ name: 'EUW', value: 'euw1' },
									{ name: 'KR', value: 'kr' },
									{ name: 'NA1', value: 'na1' }
								)
								.setRequired(true)
						)
				)
		)
		.setDefaultMemberPermissions(0)
		.setDMPermission(false),
	async execute(interaction) {
		switch (interaction.options.getSubcommandGroup()) {
			case 'lastfm': {
				switch (interaction.options.getSubcommand()) {
					case 'set': {
						await interaction.deferReply({ ephemeral: true });
						console.log(
							`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommandGroup()} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`
						);
						const user = interaction.options.getUser('user');
						const nickname = validator.escape(
							interaction.options.getString('nickname')
						);
						await interaction.editReply({
							content: `Setting \`${user.username}\` last.fm nickname to: \`${nickname}\``,
							ephemeral: true,
						});

						try {
							const row = await interaction.client.Users.create({
								user: user.id,
								lastfm: nickname,
							});

							return interaction.editReply({
								content: `\`${user.username}\` lastfm login is set to: \`${row.lastfm}\``,
								ephemeral: true,
							});
						} catch (error) {
							if (error.name === 'SequelizeUniqueConstraintError') {
								interaction.editReply({
									content: 'User exist in database, updating nickname.',
									ephemeral: true,
								});
								const affectedRows = await interaction.client.Users.update(
									{ lastfm: nickname },
									{
										where: {
											user: user.id,
											locked: { [Sequelize.Op.not]: true },
										},
									}
								);

								if (affectedRows > 0) {
									return interaction.editReply({
										content: `\`${user.username}\` new nickname is \`${nickname}\`.`,
										ephemeral: true,
									});
								} else {
									return interaction.editReply({
										content: ` Setting nickname for \`${user.username}\` failed. The user has probably blocked this possibility for you.`,
										ephemeral: true,
									});
								}
							}

							console.log(error);
							return interaction.editReply({
								content: 'Error: Something went wrong with setting a username.',
								ephemeral: true,
							});
						}
					}

					case 'remove': {
						await interaction.deferReply({ ephemeral: true });
						console.log(
							`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommandGroup()} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`
						);
						const user = interaction.options.getUser('user');
						await interaction.editReply({
							content: `Deleting \`${user.username}\` last.fm nickname from database...`,
							ephemeral: true,
						});

						// deletes user from database
						const rowCount = await interaction.client.Users.destroy({
							where: { user: user.id, locked: { [Sequelize.Op.not]: true } },
						});

						if (!rowCount) {
							return interaction.editReply({
								content: `\`${user.username}\` doesn't exist in database or has blocked this possibility for you`,
								ephemeral: true,
							});
						}

						return interaction.editReply({
							content: `\`${user.username}\` deleted from database.`,
							ephemeral: true,
						});
					}

					case 'users': {
						await interaction.deferReply({ ephemeral: true });
						console.log(
							`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommandGroup()} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`
						);
						return interaction.editReply({
							content: 'WIP: command not ready yet',
							ephemeral: true,
						});
					}

					default: {
						return interaction.editReply({
							content: 'Error: Missing subcommand.',
							ephemeral: true,
						});
					}
				}
			}

			case 'lol': {
				switch (interaction.options.getSubcommand()) {
					case 'set': {
						await interaction.deferReply({ ephemeral: true });
						console.log(
							`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommandGroup()} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`
						);

						const user = interaction.options.getUser('user');
						const region = interaction.options.getString('region');
						const nickname = validator.escape(
							interaction.options.getString('nickname')
						);

						// Obtain PUUID from nickname with tag
						const puuid = await Lol.getUserPuuid(nickname, region);
						if (puuid.error) {
							return interaction.editReply({ content: puuid.error });
						}

						await interaction.editReply(`Setting nickname to: \`${nickname}\``);

						try {
							const row = await interaction.client.Users.create({
								user: user.id,
								riot_name: nickname,
								riot_region: region,
								riot_puuid: puuid,
							});

							return interaction.editReply(
								`User League of Legends name is set to: \`${row.riot_name}\``
							);
						} catch (error) {
							if (error.name === 'SequelizeUniqueConstraintError') {
								interaction.editReply('User exist in database, updating nickname.');
								const affectedRows = await interaction.client.Users.update(
									{ riot_name: nickname, riot_region: region, riot_puuid: puuid },
									{ where: { user: user.id } }
								);

								if (affectedRows > 0) {
									return interaction.editReply(
										`User new League of Legends name is \`${nickname}\`.`
									);
								}
							}

							console.log(error);
							return interaction.editReply(
								'Error: Something went wrong with setting user League of Legends name.'
							);
						}
					}

					default: {
						return interaction.editReply({
							content: 'Error: Missing subcommand.',
							ephemeral: true,
						});
					}
				}
			}

			default: {
				return interaction.editReply({
					content: 'Error: Missing subcommand group.',
					ephemeral: true,
				});
			}
		}
	},
};
