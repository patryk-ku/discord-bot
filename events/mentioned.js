const { Events } = require('discord.js');
require('dotenv').config();
const { fetchGemini, prepareImagePrompt } = require('../helpers/gemini.js');
const { splitTextWithWordWrap, createErrorEmbed } = require('../helpers/functions.js');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		if (!process.env.GEMINI_API_KEY) {
			return;
		}

		// Ignore messages from bots
		if (message.author.bot) {
			return;
		}

		// React only for mentions from users but not @everyone and @here
		if (!message.mentions.has(message.client.user, { ignoreEveryone: true })) {
			return;
		}

		console.log(
			`-> New interaction: "AI" by ${message.author.username} on [${new Date().toString()}]`
		);

		// Author name
		const userName = message.author.globalName || message.author.username;

		// Remove bot mention from message and reject if empty msg
		let msg = `${message.content}`
			.replaceAll(/<@!?\d+>/g, '')
			.trim()
			.replaceAll('  ', ' ');
		if (msg.length == 0) {
			return;
		}
		message.channel.sendTyping();

		// Set AI personality according to .env settings
		let chatSetting = '';
		if (!process.env.GEMINI_CHAT_SETTING) {
			chatSetting =
				'You have just logged into a web chat and are answering questions from other users. Questions to you will be in the form user_name: content_message. Try to distinguish individual users by their names. Reply to them with the content of the message itself without mentioning your nickname. Here is the first question.';
		} else {
			chatSetting = process.env.GEMINI_CHAT_SETTING;
		}

		let imageSetting = '';
		if (!process.env.GEMINI_IMAGE_SETTING) {
			imageSetting =
				'You have just logged into a web chat and are answering questions from other users. Questions to you will be in the form user_name: content_message. Reply to them with the content of the message itself without mentioning your nickname. Here is the first question.';
		} else {
			imageSetting = process.env.GEMINI_IMAGE_SETTING;
		}

		// Get server chat history from bot database
		const chatHistory = await message.client.geminiChat.findAll({
			where: { guild: message.guild.id },
			limit: 40,
			raw: true,
			order: [['id', 'DESC']],
		});
		const previousChat = [];
		if (chatHistory != null) {
			if (chatHistory.length > 0) {
				for (const chat of chatHistory) {
					previousChat.push(
						{
							role: 'model',
							parts: [
								{
									text: chat.model,
								},
							],
						},
						{
							role: 'user',
							parts: [
								{
									text: chat.user,
								},
							],
						}
					);
				}
			}
		}
		previousChat.reverse();

		msg = `${userName}: ${msg}`;

		let chat;
		const file = message.attachments.first();
		if (file) {
			chat = await prepareImagePrompt(`${imageSetting} ${msg}`, file);
			if (chat.error) {
				return await message.channel.send(createErrorEmbed(chat.error));
			}
		} else {
			chat = [
				...previousChat,
				{
					role: 'user',
					parts: [
						{
							text: msg,
						},
					],
				},
			];

			chat[0].parts[0].text = `${chatSetting} ${chat[0].parts[0].text}`;
		}

		// Fetching Gemini API
		const response = await fetchGemini(chat, { maxOutputTokens: 600 });
		if (response.error) {
			console.log(response.error);
			return await message.channel.send(createErrorEmbed(response.error));
		}

		// Split message into parts if 2000 chars limit exceeded
		const messagesToSend = [];

		if (response.length <= 2000) {
			messagesToSend.push(response);
		} else {
			messagesToSend.push(...splitTextWithWordWrap(response, 2000));
		}

		// Send messages
		for (const singleMessage of messagesToSend) {
			await message.channel.send(singleMessage);
		}

		// Save message to chat history
		try {
			await message.client.geminiChat.create({
				guild: message.guild.id,
				user: msg,
				model: response,
			});
		} catch (error) {
			console.log(error);
		}
	},
};
