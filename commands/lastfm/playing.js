const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
require('dotenv').config();
const Sequelize = require('sequelize');
const Lastfm = require('../../helpers/lastfm');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('playing')
		.setDescription('Replies with entire server now playing song.')
		.addBooleanOption(option =>
			option.setName('recent')
				.setDescription('If the user isn\'t listening to anything right now, show their last song instead.'))
		.setDMPermission(false),
	async execute(interaction) {
		if (!process.env.LASTFM_API_KEY) {
			return interaction.reply(Lastfm.msg.apiDisabled());
		}

		await interaction.deferReply();
		console.log(`-> New interaction: "${interaction.commandName}" by "${interaction.user.username}" on [${new Date().toString()}]`);
		const recent = interaction.options.getBoolean('recent');

		const members = await interaction.guild.members.fetch();
		const membersIds = members.map(member => member.user.id);
		const guild = await interaction.client.Users.findAll({ where: { user: { [Sequelize.Op.in]: membersIds } } });

		if (guild.length == 0) {
			return await interaction.editReply('No one on this server has submitted their last.fm nickname to the bot.');
		}

		const request = [];
		const requestUsersId = [];
		for (let i = 0; i < guild.length; i++) {
			const lastfmNickname = guild[i].dataValues.lastfm;
			const user = Lastfm.getNowPlaying(await interaction.client.users.fetch(guild[i].dataValues.user), lastfmNickname);
			requestUsersId.push(guild[i].dataValues.user);
			request.push(user);

			if (i == 24) {
				break;
			}

		}

		const users = await Promise.all(request).catch((error) => {
			console.error(error);
			return interaction.editReply(Lastfm.msg.unknownApiError(error));
		});

		const songEmbed = new EmbedBuilder()
			.setColor(0xC3000D)
			.setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() });

		let descriptionString = '### Now Playing:';
		let usersCounter = 0;
		for (const [index, user] of users.entries()) {
			if (user.error) {
				continue;
			}
			if (user.track[0]['@attr']) {
				if (user.track[0]['@attr'].nowplaying) {
					usersCounter++;
					descriptionString += `\n<@${requestUsersId[index]}>: **${user.track[0].artist['#text']}** - [**${user.track[0].name}**](${user.track[0].url})`;
				}
			}

			if (usersCounter == 24) {
				songEmbed.setFooter({ text: 'Displaying max 25 users.' });
				break;
			}
		}
		let first = true;
		for (const [index, user] of users.entries()) {
			if (user.error) {
				continue;
			}
			if (user.track[0]['@attr']) {
				if (user.track[0]['@attr'].nowplaying) {
					continue;
				}
			}
			if (recent && user.track[0]) {
				if (first) {
					descriptionString += '\n### Recently Played:';
					first = false;
				}
				usersCounter++;
				descriptionString += `\n<@${requestUsersId[index]}>: **${user.track[0].artist['#text']}** - [**${user.track[0].name}**](${user.track[0].url})`;
			}

			if (usersCounter == 25) {
				songEmbed.setFooter({ text: 'Displaying max 25 users.' });
				break;
			}
		}

		if (usersCounter == 0) {
			await interaction.editReply('Nobody on this server listens to music right now ❌');
			return;
		}

		songEmbed.setDescription(descriptionString);
		// songEmbed.setFooter({text: `${usersCounter} users in total.`});
		await interaction.editReply({ content: '', embeds: [songEmbed] });
	},
};