const { SlashCommandBuilder } = require('discord.js');
const validator = require('validator');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('admin')
		.setDescription('Administrator options. You can edit other users settings here etc.')
		.addSubcommandGroup(subcommandgroup =>
			subcommandgroup
				.setName('lastfm')
				.setDescription('Last.fm options.')
				.addSubcommand(subcommand =>
					subcommand
						.setName('set')
						.setDescription('Set or update anyone last.fm nickname.')
						.addUserOption(option =>
							option.setName('user')
								.setDescription('The user.')
								.setRequired(true))
						.addStringOption(option =>
							option.setName('nickname')
								.setDescription('Last.fm nickname.')
								.setRequired(true)))
				.addSubcommand(subcommand =>
					subcommand
						.setName('remove')
						.setDescription('Delete any user lastfm nickname from bot database.')
						.addUserOption(option =>
							option.setName('user')
								.setDescription('The user.')
								.setRequired(true)))
				.addSubcommand(subcommand =>
					subcommand
						.setName('users')
						.setDescription('List all last.fm users from this server.')))
		.setDefaultMemberPermissions(0),
	async execute(interaction) {

		switch (interaction.options.getSubcommandGroup()) {
			case 'lastfm': {

				switch (interaction.options.getSubcommand()) {
					case 'set': {
						await interaction.deferReply({ ephemeral: true });
						console.log('-> New interaction: "admin lastfm set"');
						const user = interaction.options.getUser('user');
						const nickname = validator.escape(interaction.options.getString('nickname'));
						await interaction.editReply({ content: `Setting \`${user.username}\` last.fm nickname to: \`${nickname}\``, ephemeral: true });

						try {
							const row = await interaction.client.Users.create({
								user: user.id,
								lastfm: nickname,
							});

							return interaction.editReply({ content: `\`${user.username}\` lastfm login is set to: \`${row.lastfm}\``, ephemeral: true });
						} catch (error) {
							if (error.name === 'SequelizeUniqueConstraintError') {
								interaction.editReply({ content: 'User exist in database, updating nickname.', ephemeral: true });
								const affectedRows = await interaction.client.Users.update({ lastfm: nickname }, { where: { user: user.id } });

								if (affectedRows > 0) {
									return interaction.editReply({ content: `\`${user.username}\` new nickname is \`${nickname}\`.`, ephemeral: true });
								}
							}

							console.log(error);
							return interaction.editReply({ content: 'Error: Something went wrong with setting a username.', ephemeral: true });
						}

					}

					case 'remove': {
						await interaction.deferReply({ ephemeral: true });
						console.log('-> New interaction: "admin lastfm remove"');
						const user = interaction.options.getUser('user');
						await interaction.editReply({ content: `Deleting \`${user.username}\` last.fm nickname from database...`, ephemeral: true });

						// deletes user from database
						const rowCount = await interaction.client.Users.destroy({ where: { user: user.id } });

						if (!rowCount) {
							return interaction.editReply({ content: `\`${user.username}\` doesn't exist in database.`, ephemeral: true });
						}

						return interaction.editReply({ content: `\`${user.username}\` deleted from database.`, ephemeral: true });
					}

					case 'users': {
						await interaction.deferReply({ ephemeral: true });
						console.log('-> New interaction: "admin lastfm users"');
						return interaction.editReply({ content: 'WIP: command not ready yet', ephemeral: true });
					}

					default: {
						return interaction.editReply({ content: 'Error: Missing subcommand.', ephemeral: true });
					}
				}

			}
			default: {
				return interaction.editReply({ content: 'Error: Missing subcommand group.', ephemeral: true });
			}
		}

	},
};