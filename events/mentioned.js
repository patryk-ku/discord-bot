const { Events } = require('discord.js');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Gemini = require('../helpers/gemini');

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
		let userName = message.author.username;
		if (message.author.globalName) {
			if (message.author.globalName.length > 0) {
				userName = message.author.globalName;
			}
		}

		// Remove bot mention from message and reject if empty msg
		let msg = `${message.content}`
			.replaceAll(/<@!?\d+>/g, '')
			.trim()
			.replaceAll('  ', ' ');
		if (msg.length == 0) {
			return;
		}
		// msg = `${userName}: ${msg}`;
		message.channel.sendTyping();

		const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

		// Disable all safety settings
		const safetySettings = Gemini.safetySettings;

		const generationConfig = Gemini.generationConfig;

		// Set AI personality according to .env settings
		let chatSetting = '';
		if (!process.env.GEMINI_CHAT_SETTING) {
			chatSetting =
				'You have just logged into a web chat and are answering questions from other users. Questions to you will be in the form user_name: content_message. Try to distinguish individual users by their names. Reply to them with the content of the message itself without mentioning your nickname.';
		} else {
			chatSetting = process.env.GEMINI_CHAT_SETTING;
		}

		let imageSetting = '';
		if (!process.env.GEMINI_IMAGE_SETTING) {
			imageSetting =
				'You have just logged into a web chat and are answering questions from other users. Questions to you will be in the form user_name: content_message. Try to distinguish individual users by their names. Reply to them with the content of the message itself without mentioning your nickname.';
		} else {
			imageSetting = process.env.GEMINI_IMAGE_SETTING;
		}

		// Check if message contains any file and then use different model
		const file = message.attachments.first()?.url;
		if (file) {
			// console.log(message.attachments.first());
			try {
				const response = await Gemini.imagePrompt(
					`${imageSetting}${msg}`,
					message.attachments.first()
				);
				await message.channel.send(response);

				// Save message to chat history
				try {
					await message.client.geminiChat.create({
						guild: message.guild.id,
						user: `${userName}: ${msg}`,
						model: response,
					});
				} catch (error) {
					console.log(error);
				}

				return;
			} catch (error) {
				console.log(error);
				if (error.text) {
					return await message.channel.send(error.text);
				} else {
					return await message.channel.send('```' + error.message + '```');
				}
			}
		}

		const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

		// Get user chat history from bot database
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
							parts: chat.model,
						},
						{
							role: 'user',
							parts: chat.user,
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
					parts: chatSetting,
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

		// Finally send request to gemini api
		let entireResponse = '';
		let isFirstChunk = true;
		let msgRef;
		msg = `${userName}: ${msg}`;
		try {
			const result = await chat.sendMessageStream(msg).catch(async (error) => {
				console.log(error);
				// Retry request
				msgRef = await message.channel.send(
					`\`\`\`${error}\`\`\`\n**Please Wait**, retrying request.\n*What an epic QOL update isn't it xD?*`
				);
				isFirstChunk = false;
				chat.sendMessageStream(msg);
			});

			// Update response on new data
			for await (const chunk of result.stream) {
				entireResponse += chunk.text();
				if (entireResponse.length == 0) {
					console.log(result);
				}

				if (isFirstChunk) {
					msgRef = await message.channel.send(entireResponse);
					isFirstChunk = false;
				} else {
					msgRef.edit(entireResponse);
				}
			}

			// Save message to chat history
			if (entireResponse.length > 0) {
				try {
					await message.client.geminiChat.create({
						guild: message.guild.id,
						user: msg,
						model: entireResponse,
					});
				} catch (error) {
					console.log(error);
				}
			}
			return;
		} catch (error) {
			console.log(error);
			return await message.channel.send('```' + error.message + '```');
		}
	},
};
