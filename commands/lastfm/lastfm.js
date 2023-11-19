const { SlashCommandBuilder } = require('discord.js');
const validator = require('validator');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('lastfm')
		.setDescription('Last.fm options.')
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
				.setDescription('Delete your lastfm nickname from bot database.')),
	async execute(interaction) {

		switch (interaction.options.getSubcommand()) {

			case 'set': {
				await interaction.deferReply();

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
						// return interaction.editReply('Error: That user already exists. Use `updatelastfm` command instead');

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
				await interaction.editReply('Deleting your last.fm username from database...');

				// deletes user from database
				const rowCount = await interaction.client.Users.destroy({ where: { user: interaction.user.id } });

				if (!rowCount) {
					return interaction.editReply('That user doesn\'t exist in database.');
				}

				return interaction.editReply('User deleted.');
			}

			default: {
				return interaction.reply({ content: 'Error: Missing subcommand.', ephemeral: true });
			}
		}
	},
};