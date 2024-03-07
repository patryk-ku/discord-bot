const { Events } = require('discord.js');
require('dotenv').config();
const { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } = require('@google/generative-ai');

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
		message.channel.sendTyping();

		// Remove bot mention from message and reject if empty msg
		const msg = message.content
			.replaceAll(/<@!?\d+>/g, '')
			.trim()
			.replaceAll('  ', ' ');
		if (msg.length == 0) {
			return;
		}

		const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
		const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

		// Set AI personality according to .env settings
		let aiSetting = '';
		if (!process.env.GEMINI_CHAT_SETTING) {
			aiSetting = 'Act as typical Discord user.';
		} else {
			aiSetting = process.env.GEMINI_CHAT_SETTING;
		}

		// Disable all safety settings
		const safetySettings = [
			{
				category: HarmCategory.HARM_CATEGORY_HARASSMENT,
				threshold: HarmBlockThreshold.BLOCK_NONE,
			},
			{
				category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
				threshold: HarmBlockThreshold.BLOCK_NONE,
			},
			{
				category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
				threshold: HarmBlockThreshold.BLOCK_NONE,
			},
			{
				category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
				threshold: HarmBlockThreshold.BLOCK_NONE,
			},
		];

		// Get user chat history from bot database
		const chatHistory = await message.client.AiChatHistory.findAll({
			where: { user: message.author.id },
			limit: 5,
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
							parts: chat.answer,
						},
						{
							role: 'user',
							parts: chat.question,
						}
					);
				}
			}
		}
		previousChat.reverse();
		// console.log(previousChat);

		const chat = model.startChat({
			history: [
				{
					role: 'user',
					parts: aiSetting,
				},
				{
					role: 'model',
					parts: 'Ok.',
				},
				...previousChat,
			],
			generationConfig: {
				maxOutputTokens: 400,
			},
			safetySettings,
		});

		try {
			const result = await chat.sendMessage(msg);
			const response = await result.response.text();

			if (response.length > 0) {
				// Save message to chat history
				try {
					await message.client.AiChatHistory.create({
						user: message.author.id,
						question: msg,
						answer: response,
					});
				} catch (error) {
					console.log(error);
				}

				// And reply to user
				return await message.channel.send(response);
			} else {
				console.log(result.response);
				return await message.channel.send('**ERROR** 💀');
			}
		} catch (error) {
			return message.channel.send('```' + error.message + '```');
		}
	},
};
