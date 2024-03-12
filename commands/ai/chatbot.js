const { SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('chatbot')
		.setDescription('Chatbot options.')
		.addSubcommand((subcommand) =>
			subcommand.setName('reset').setDescription('Reset bot chat history.')
		)
		.setDMPermission(false),
	async execute(interaction) {
		if (!process.env.GEMINI_API_KEY) {
			return interaction.reply(
				'Gemini AI commands are **disabled** because the bot owner did not provided an Gemini API key.'
			);
		}

		switch (interaction.options.getSubcommand()) {
			case 'reset': {
				await interaction.deferReply();
				console.log(
					`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`
				);

				// Gel all previous chats
				let chatHistory = await interaction.client.geminiChat.findAll({
					where: { guild: interaction.guild.id },
					raw: true,
					order: [['id', 'ASC']],
				});

				if (chatHistory.length == 0) {
					return await interaction.editReply('There is no chat history to reset');
				}

				chatHistory = chatHistory.map(({ guild, user, model }) => {
					return { guild, user, model };
				});

				// Save previous chats to archive
				try {
					await interaction.client.geminiChatArchive.bulkCreate(chatHistory);
				} catch (error) {
					console.log(error);
					return await interaction.editReply('```' + error + '```');
				}

				// And delete them from chats table
				try {
					await interaction.client.geminiChat.destroy({
						where: { guild: interaction.guild.id },
					});
				} catch (error) {
					return await interaction.editReply('```' + error + '```');
				}

				return await interaction.editReply('Chatbot history successfully deleted.');
			}

			default: {
				return interaction.reply({
					content: 'Error: Missing subcommand.',
					ephemeral: true,
				});
			}
		}
	},
};
