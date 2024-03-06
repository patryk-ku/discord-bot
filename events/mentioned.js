const { Events } = require('discord.js');
require('dotenv').config();
const { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } = require('@google/generative-ai');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		if (!process.env.GEMINI_API_KEY) {
			return;
		}

		if (message.author.bot) {
			return;
		}

		if (message.mentions.has(message.client.user, { ignoreEveryone: true })) {
			try {
				console.log(`-> New interaction: "AI" on [${new Date().toString()}]`);
				message.channel.sendTyping();
				const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
				const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

				let aiSetting = '';
				if (!process.env.GEMINI_CHAT_SETTING) {
					aiSetting = 'Act as typical Discord user.';
				} else {
					aiSetting = process.env.GEMINI_CHAT_SETTING;
				}

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
					],
					generationConfig: {
						maxOutputTokens: 100,
					},
					safetySettings,
				});

				const msg = message.content.replaceAll(/<@!?\d+>/g, '');
				const result = await chat.sendMessage(msg);

				const response = await result.response.text();

				if (response.length > 0) {
					return await message.channel.send(response);
				} else {
					return await message.channel.send('idk error');
				}
			} catch (error) {
				console.log(error);
			}
		}
	},
};
