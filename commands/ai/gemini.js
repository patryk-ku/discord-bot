const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const Gemini = require('../../helpers/gemini');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('gemini')
		.setDescription('Google Gemini chatbot.')
		.addStringOption((option) =>
			option.setName('prompt').setDescription('Your question to the bot.').setRequired(true)
		)
		.addAttachmentOption((option) =>
			option.setRequired(false).setName('image').setDescription('Image (max 2,75 MB).')
		)
		.setDMPermission(false),
	async execute(interaction) {
		if (!process.env.GEMINI_API_KEY) {
			return interaction.reply(
				'Gemini AI commands are **disabled** because the bot owner did not provided an Gemini API key.'
			);
		}

		await interaction.deferReply();
		console.log(
			`-> New interaction: "${interaction.commandName}" by "${interaction.user.username}" on [${new Date().toString()}]`
		);
		const user = interaction.user;
		const prompt = interaction.options.getString('prompt');

		// Check if interaction contains any file and then use different model
		const file = interaction.options.getAttachment('image');
		if (file) {
			try {
				const response = await Gemini.imagePrompt(prompt, file);
				const embed = new EmbedBuilder()
					.setColor('#4c86e3')
					.setAuthor({ name: `${user.username} request:`, iconURL: user.avatarURL() })
					.setFooter({ text: 'Google Gemini Pro' })
					.setTimestamp(new Date())
					.setDescription(`${prompt}\n## Gemini AI response:\n${response}`)
					.setImage(file.url);

				return interaction.editReply({ content: '', embeds: [embed] });
			} catch (error) {
				console.log(error);
				if (error.text) {
					return await interaction.editReply(error.text);
				} else {
					return await interaction.editReply('```' + error.message + '```');
				}
			}
		}

		const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

		// Disable all safety settings
		const safetySettings = Gemini.safetySettings;

		const model = genAI.getGenerativeModel({ model: 'gemini-pro', safetySettings });

		const result = await model.generateContent(prompt).catch((error) => {
			console.log(error);
			return interaction.editReply('```' + error + '```');
		});

		try {
			const response = result.response.text();
			const embed = new EmbedBuilder()
				.setColor('#4c86e3')
				.setAuthor({ name: `${user.username} request:`, iconURL: user.avatarURL() })
				.setFooter({ text: 'Google Gemini Pro' })
				.setTimestamp(new Date())
				.setDescription(`${prompt}\n## Gemini AI response:\n${response}`);

			return interaction.editReply({ content: '', embeds: [embed] });
		} catch (error) {
			console.log(error);

			if (error.response.promptFeedback?.blockReason == 'SAFETY') {
				let reply = 'Response was blocked because of safety reasons:\n```';
				for (const rating of error.response.promptFeedback.safetyRatings) {
					reply += `\n- ${rating.category}: ${rating.probability}`;
				}
				reply += '```';
				return await interaction.editReply(reply);
			}

			return await interaction.editReply('```' + error + '```');
		}
	},
};
