const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
require('dotenv').config();
const { fetchGemini, prepareImagePrompt } = require('../../helpers/gemini.js');
const {
	splitTextWithWordWrap,
	createWarningEmbed,
	createErrorEmbed,
} = require('../../helpers/functions.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('gemini')
		.setDescription('Google Gemini chatbot.')
		.addStringOption((option) =>
			option.setName('prompt').setDescription('Your question to the bot.').setRequired(true)
		)
		.addAttachmentOption((option) =>
			option.setRequired(false).setName('image').setDescription('Image (max 12 MB).')
		)
		.addStringOption((option) =>
			option
				.setName('model')
				.setDescription('Gemini model (default: gemini-1.5-pro)')
				.addChoices(
					{ name: 'gemini-1.5-pro', value: 'gemini-1.5-pro' },
					{ name: 'gemini-1.5-flash', value: 'gemini-1.5-flash' },
					{ name: 'gemini-pro', value: 'gemini-pro' }
				)
		)
		.setDMPermission(false),
	async execute(interaction) {
		if (!process.env.GEMINI_API_KEY) {
			return interaction.reply(
				createWarningEmbed(
					'Gemini AI commands are **disabled** because the bot owner did not provided an Gemini API key.'
				)
			);
		}

		await interaction.deferReply();
		console.log(
			`-> New interaction: "${interaction.commandName}" by "${interaction.user.username}" on [${new Date().toString()}]`
		);
		const user = interaction.user;
		const prompt = interaction.options.getString('prompt');
		const model = interaction.options.getString('model') ?? 'gemini-1.5-pro';

		// Check if interaction contains any image and if yes then prepare it for prompt
		let chat;
		const file = interaction.options.getAttachment('image');
		if (file) {
			chat = await prepareImagePrompt(prompt, file);
			if (chat.error) {
				return await interaction.editReply(createErrorEmbed(chat.error));
			}
		} else {
			chat = [
				{
					role: 'user',
					parts: [
						{
							text: prompt,
						},
					],
				},
			];
		}

		// Fetching Gemini API
		const response = await fetchGemini(chat, { model: model });
		if (response.error) {
			console.log(response.error);
			return await interaction.editReply(createErrorEmbed(response.error));
		}

		// Create and send embeds
		const userName = user.globalName || user.username;
		const botName = interaction.client.user.globalName || interaction.client.user.username;

		const question = new EmbedBuilder()
			.setColor('#8779CB')
			.setAuthor({ name: `${userName}:`, iconURL: user.avatarURL() })
			.setDescription(prompt);

		if (file) {
			question.setImage(file.url);
		}

		// 2000 chars limit for single message
		if (response.length <= 2000) {
			const answer = new EmbedBuilder()
				.setColor('#4c86e3')
				.setAuthor({
					name: `${botName}:`,
					iconURL: interaction.client.user.avatarURL(),
				})
				.setFooter({ text: model })
				.setTimestamp(new Date())
				.setDescription(response);

			return interaction.editReply({ content: '', embeds: [question, answer] });
		} else {
			const responseParts = splitTextWithWordWrap(response, 2000);
			console.log(responseParts);
			const embeds = [];

			const answer = new EmbedBuilder()
				.setColor('#4c86e3')
				.setAuthor({
					name: `${botName}:`,
					iconURL: interaction.client.user.avatarURL(),
				})
				.setDescription(responseParts[0]);

			responseParts.shift();

			for (const part of responseParts) {
				const answerPart = new EmbedBuilder().setColor('#4c86e3').setDescription(part);
				embeds.push(answerPart);
			}

			embeds.at(-1).setFooter({ text: model });
			embeds.at(-1).setTimestamp(new Date());

			return interaction.editReply({ content: '', embeds: [question, answer, ...embeds] });
		}
	},
};
