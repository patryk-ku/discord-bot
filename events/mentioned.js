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

		const generationConfig = {
			maxOutputTokens: 400,
		};

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
			// Check image type and file size
			const allowedImageTypes = [
				'image/png',
				'image/jpeg',
				'image/webp',
				'image/heic',
				'image/heif',
			];
			// max 4 MB for enire request so I let 2,75 for image because of base64 conversion rate
			const maxImageSize = 1024 * 1024 * 2.75;
			if (Number(message.attachments.first().size) > maxImageSize) {
				return await message.channel.send('File too big. (Max file size is 2,75 MB)');
			}
			if (!allowedImageTypes.includes(message.attachments.first().contentType)) {
				return await message.channel.send(
					'File type not supported. (Allowed file types: png, jpg, webp, heic, heif'
				);
			}

			// Donwnload image to buffer
			let buffer;
			try {
				const response = await fetch(file);
				buffer = await response.arrayBuffer();
			} catch (error) {
				console.log(error);
				return message.channel.send('Error: Failed to download image.');
			}

			const model = genAI.getGenerativeModel({
				model: 'gemini-pro-vision',
				generationConfig,
				safetySettings,
			});
			const image = {
				inlineData: {
					data: Buffer.from(buffer).toString('base64'),
					mimeType: 'image/png',
				},
			};

			let entireResponse = '';
			let isFirstChunk = true;
			let msgRef;
			try {
				const msgEdit = `${imageSetting}${msg}`;
				const result = await model.generateContentStream([msgEdit, image]);

				// Update response on new data
				for await (const chunk of result.stream) {
					entireResponse += chunk.text();
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
							user: `${userName}: ${msg}`,
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
		console.log(previousChat);

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
			const result = await chat.sendMessageStream(msg);

			// Update response on new data
			for await (const chunk of result.stream) {
				entireResponse += chunk.text();
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

			// const result = await chat.sendMessage(msg);
			// const response = await result.response.text();

			// if (response.length > 0) {
			// 	// Save message to chat history
			// 	try {
			// 		await message.client.geminiChat.create({
			// 			guild: message.guild.id,
			// 			user: msg,
			// 			model: response,
			// 		});
			// 	} catch (error) {
			// 		console.log(error);
			// 	}

			// 	// And reply to user
			// 	return await message.channel.send(response);
			// } else {
			// 	console.log(result.response);
			// 	return await message.channel.send('**ERROR** 💀');
			// }
		} catch (error) {
			console.log(error);
			return await message.channel.send('```' + error.message + '```');
		}
	},
};
