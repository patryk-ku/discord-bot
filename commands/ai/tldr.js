const { SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const { fetchGemini } = require('../../helpers/gemini.js');
const {
	splitTextWithWordWrap,
	createWarningEmbed,
	createErrorEmbed,
} = require('../../helpers/functions.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tldr')
		.setDescription('Summarizes recent messages on this channel using AI.')
		.addIntegerOption((option) =>
			option
				.setName('amount')
				.setDescription('Number of last messages (default 200 max 2000).')
				.setMinValue(50)
				.setMaxValue(2000)
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

		const amount = interaction.options.getInteger('amount') ?? 200;
		const model = interaction.options.getString('model') ?? 'gemini-1.5-pro';

		// Fetching messages from Discord channel
		const messages = [];
		let lastId;
		const options = { limit: 100 };

		for (let i = 0; i < amount / 100; i++) {
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
				return await interaction.editReply(createErrorEmbed('Failed to load messages.'));
			}
		}
		messages.reverse();

		// TODO: condsider moving to separate file
		async function getUserName(id) {
			let username;

			if (!username) {
				username = await interaction.client.users?.cache.get(id)?.globalName;
			}

			if (!username) {
				username = await interaction.client.users?.cache.get(id)?.username;
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

		// Creating prompt with chat history.
		let chatHistory = '';

		for (const message of messages.values()) {
			if (message[1].content?.length > 0) {
				const userName = message[1].author.globalName || message[1].author.username;
				chatHistory += `${userName}: ${await parseMentions(message[1].content)}\n\n`;
			}
		}

		if (chatHistory.length === 0) {
			console.log('Error: Chat history is empty.');
			return await interaction.editReply(createErrorEmbed('Failed to load messages.'));
		}

		const prompt = [
			{
				role: 'user',
				parts: [
					{
						text: `Summarise briefly but retaining all the key details of web chat user conversations. Use the ironic funny way people express themselves on the internet. At the end, write out the most important information in bullet points. Each message is separated by one blank line and preceded by the username and a colon. Reply in the language in which the conversation mainly took place. Here is the conversation:\n${chatHistory}`,
					},
				],
			},
		];

		// Fetching Gemini API
		let aiSummary = await fetchGemini(prompt, { model: model });
		if (aiSummary.error) {
			console.log(aiSummary.error);

			return await interaction.editReply(createErrorEmbed(aiSummary.error));
		}

		// Sending response to channel
		aiSummary = `# Summary of last ${amount} channel messages:\n` + aiSummary;

		if (aiSummary.length < 2000) {
			return await interaction.editReply(aiSummary);
		} else {
			await interaction.editReply('✅ Summary ready, sending...');
			const textArray = splitTextWithWordWrap(aiSummary, 2000);
			for (const text of textArray) {
				await interaction.channel.send(text);
			}
		}
		return;
	},
};
