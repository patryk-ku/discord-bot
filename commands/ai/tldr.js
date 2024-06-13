const { SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const { fetchGemini } = require('../../helpers/gemini.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tldr')
		.setDescription('Summarizes recent messages on this channel using AI.')
		.addIntegerOption((option) =>
			option
				.setName('amount')
				.setDescription('Number of last messages (default 200).')
				.setMinValue(50)
				.setMaxValue(10000)
		)
		.addStringOption((option) =>
			option
				.setName('model')
				.setDescription('Gemini model.')
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
				'Gemini AI commands are **disabled** because the bot owner did not provided an Gemini API key.'
			);
		}

		await interaction.deferReply();
		console.log(
			`-> New interaction: "${interaction.commandName}" by "${interaction.user.username}" on [${new Date().toString()}]`
		);
		const amount = interaction.options.getInteger('amount') ?? 200;
		const model = interaction.options.getString('model') ?? 'gemini-1.5-flash';
		console.log('model: ', model);

		const messages = [];
		let lastId;
		const options = { limit: 100 };

		for (let i = 0; i < amount / 100; i++) {
			console.log('page:', i);
			if (lastId) {
				options.before = lastId;
			}

			try {
				const messagesPart = await interaction.channel.messages.fetch(options);
				messages.push(...messagesPart);
				if (messagesPart.last()?.id) {
					lastId = messagesPart.last().id;
				} else if (messages.length > 0 && !messagesPart.last()?.id) {
					break;
				}
			} catch (error) {
				console.log(error);
				return await interaction.editReply('**Error**: Failed to load messages.');
			}
		}
		console.log('msg amount: ', messages.length);
		messages.reverse();

		// TODO: move to separate file
		async function getUserName(id) {
			let username;
			// let username = await guildMembers.cache.get(id)?.user?.username;

			// if (!username) {
			// 	username = await guildMembers.fetch(id)?.user?.username;
			// }

			if (!username) {
				username = await interaction.client.users.cache.get(id)?.username;
			}
			return username ? username : 'UnknownUsername';
		}
		async function parseMentions(text) {
			const idList = text.match(/<@(\d+)>/g);

			if (!idList) return text;

			const userNames = [];

			for (const userId of idList) {
				if (userNames[userId]) {
					continue;
				}

				const name = await getUserName(userId.slice(2, -1));
				userNames[userId] = name;
			}

			return text.replace(/<@(\d+)>/g, (match) => userNames[match]);
		}

		let chatHistory = '';

		for (const message of messages.values()) {
			if (message[1].content?.length > 0) {
				// console.log(
				// 	`${message.author.username}: ${await parseMentions(interaction.guild.members, message.content)}`
				// );
				chatHistory += `${message[1].author.username}: ${await parseMentions(message[1].content)}\n\n`;
			}
		}

		if (chatHistory.length === 0) {
			console.log('len 0 error');
			return await interaction.editReply('**Error**: Failed to load messages.');
		}

		const prompt = [
			{
				role: 'user',
				parts: [
					{
						text: `Briefly summarise the conversations of chat users. Each message is separated by one blank line and preceded by the username and a colon. Reply in the language in which the conversation mainly took place. Here is the conversation:\n${chatHistory}`,
					},
				],
			},
		];

		let aiSummary = await fetchGemini(prompt, {}, model);
		if (aiSummary.error) {
			console.log(aiSummary.error);
			return await interaction.editReply('**Error**: Failed to fetch Gemini api.');
		}

		aiSummary = `# Summary of last ${amount} channel messages:\n` + aiSummary;

		if (aiSummary.length < 2000) {
			return await interaction.editReply(aiSummary);
		} else {
			// not tested yet
			for (let i = 0; i < aiSummary.length; i += 2000) {
				if (i === 0) {
					await interaction.editReply(aiSummary.substring(0, 2000));
				} else {
					await interaction.followUp(aiSummary.substring(0, 2000));
				}
				aiSummary = aiSummary.substring(2000);
			}
		}

		return;
	},
};
