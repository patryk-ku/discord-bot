const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
// const validator = require('validator');
require('dotenv').config();
const Sequelize = require('sequelize');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('playing')
		.setDescription('Replies with entire server now playing song.')
		.addBooleanOption(option =>
			option.setName('recent')
				.setDescription('If the user isn\'t listening to anything right now, show their last song instead.'))
		.setDMPermission(false),
	async execute(interaction) {
		await interaction.deferReply();
		console.log('-> New interaction: "playing"');
		const recent = interaction.options.getBoolean('recent');
		await interaction.editReply('Loading...');
		await interaction.editReply('Connecting with database...');

		const members = await interaction.guild.members.fetch();
		const membersIds = members.map(member => member.user.id);
		// console.log(membersIds);

		const guild = await interaction.client.Users.findAll({ where: { user: { [Sequelize.Op.in]: membersIds } } });
		// console.log(guild);

		if (guild.length == 0) {
			return await interaction.editReply('No one on this server has submitted their last.fm nickname to the bot.');
		}

		await interaction.editReply('Fetching data from last.fm for all users...');
		const request = [];
		for (let i = 0; i < guild.length; i++) {
			const fmlogin = guild[i].dataValues.lastfm;
			// console.log(`fetching user: ${fmlogin}`);
			const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${fmlogin}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=1`;
			const user = fetch(url).then((res) => res.json());
			request.push(user);
		}

		const users = await Promise.all(request);
		await interaction.editReply('Creating and sending a message...');
		let usersCounter = 0;

		const songEmbed = new EmbedBuilder()
			.setColor(0xC3000D)
			.setAuthor({ name: `${interaction.guild.name} - now playing:`, iconURL: `https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.jpg` });

		for (const user of users) {
			if (user.error) {
				continue;
			}

			if (!user.recenttracks) {
				continue;
			}

			if (user.recenttracks.track[0]['@attr']) {
				if (user.recenttracks.track[0]['@attr'].nowplaying) {
					usersCounter++;
					songEmbed.addFields({ name: user.recenttracks['@attr'].user, value: `- ${user.recenttracks.track[0].name} - ${user.recenttracks.track[0].artist['#text']}` },
					);
				}
			} else if (recent && user.recenttracks.track[0]) {
				usersCounter++;
				songEmbed.addFields({ name: user.recenttracks['@attr'].user + ' (last song)', value: `- ${user.recenttracks.track[0].name} - ${user.recenttracks.track[0].artist['#text']}` },
				);
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

		await interaction.editReply({ content: '', embeds: [songEmbed] });
	},
};