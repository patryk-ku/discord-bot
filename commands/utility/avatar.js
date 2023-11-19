const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('avatar')
		.setDescription('Embeds avatar image of given user.')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('The user')),
	async execute(interaction) {
		await interaction.deferReply();
		console.log('-> New interaction: "avatar"');
		const user = interaction.options.getUser('user') ?? interaction.user;
		const file = new AttachmentBuilder(user.avatarURL());
		await interaction.editReply({ content: `\`${user.username}\` avatar:`, files: [file] });
	},
};