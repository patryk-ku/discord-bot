const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('debug')
		.setDescription('Get debug info.')
		.addSubcommand(subcommand =>
			subcommand
				.setName('user')
				.setDescription('Debug info about a user.'),
			// .addUserOption(option => option.setName('target').setDescription('The user'))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('server')
				.setDescription('Debug info about the server.'))
		.setDefaultMemberPermissions(0)
		.setDMPermission(false),
	async execute(interaction) {
		const subcommand = interaction.options.getSubcommand();

		if (subcommand === 'user') {

			// interaction.user is the object representing the User who ran the command
			// interaction.member is the GuildMember object, which represents the user in the specific guild
			await interaction.reply(`This command was run by ${interaction.user.username}, who joined on ${interaction.member.joinedAt}.`);
			console.log(interaction.user);
			console.log(interaction);
			// await interaction.channel.send('dummy message');

		} else if (subcommand === 'server') {

			await interaction.reply(`This server is ${interaction.guild.name} and has ${interaction.guild.memberCount} members.`);
			console.log(interaction.guild.members);

			// const users = await interaction.guild.members.fetch();
			// console.log(users);
		} else {
			await interaction.reply('Error: missing subcommand.');
		}
	},
};