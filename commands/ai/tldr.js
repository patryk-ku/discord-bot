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
				.setDescription('Number of last messages (default 50).')
				.setMinValue(10)
				.setMaxValue(250)
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
		const amount = interaction.options.getInteger('amount') ?? 50;

		let messages;
		try {
			messages = await interaction.channel.messages.fetch({ limit: amount + 1 });
		} catch (error) {
			return await interaction.editReply('**Error**: Failed to load messages.');
		}
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
			if (message.content.length > 0) {
				// console.log(
				// 	`${message.author.username}: ${await parseMentions(interaction.guild.members, message.content)}`
				// );
				chatHistory += `${message.author.username}: ${await parseMentions(message.content)}\n\n`;
			}
		}

		if (chatHistory.length === 0) {
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

		const aiSummary = await fetchGemini(prompt, {});
		if (aiSummary.error) {
			console.log(aiSummary.error);
			return await interaction.editReply('**Error**: Failed to fetch Gemini api.');
		}

		return await interaction.editReply(
			`## Summary of last ${amount} channel messages:\n${aiSummary}`
		);
	},
};
