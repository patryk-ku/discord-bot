const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const validator = require('validator');
const querystring = require('node:querystring');
const Sequelize = require('sequelize');
require('dotenv').config();
const Lol = require('../../helpers/lol');
const { secondsToHoursMinutes } = require('../../helpers/functions');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('lol')
		.setDescription('League of Legends commands.')
		.addSubcommandGroup((subcommandgroup) =>
			subcommandgroup
				.setName('nickname')
				.setDescription('League of Legends nickname options.')
				.addSubcommand((subcommand) =>
					subcommand
						.setName('set')
						.setDescription('Set or update your League of Legends nickname.')
						.addStringOption((option) =>
							option
								.setName('nickname')
								.setDescription(
									'Your League of Legends nickname with tag (Nickname#TAG)'
								)
								.setRequired(true)
						)
						.addStringOption((option) =>
							option
								.setName('region')
								.setDescription('User League of Legends region.')
								.addChoices(
									{ name: 'EUNE', value: 'eun1' },
									{ name: 'EUW', value: 'euw1' },
									{ name: 'KR', value: 'kr' },
									{ name: 'NA1', value: 'na1' }
								)
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('remove')
						.setDescription('Delete your League of Legends nickname from bot database.')
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('np')
				.setDescription('Replies with user current game info (if playing).')
				.addUserOption((option) =>
					option.setName('user').setDescription('The user (default you).')
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('playing')
				.setDescription('Replies with entire server current game info.')
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('recent')
				.setDescription('Replies with user last games info.')
				.addUserOption((option) =>
					option.setName('user').setDescription('The user (default you).')
				)
				.addIntegerOption((option) =>
					option
						.setName('amount')
						.setDescription('Number of games (default 5, max 10).')
						.setMinValue(1)
						.setMaxValue(10)
				)
		)
		.setDMPermission(false),
	async execute(interaction) {
		if (!process.env.RIOTGAMES_TOKEN) {
			return interaction.reply(
				'League of Legends commands are **disabled** because the bot owner did not provided an Riot Games API token.'
			);
		}

		switch (interaction.options.getSubcommandGroup()) {
			case 'nickname': {
				switch (interaction.options.getSubcommand()) {
					case 'set': {
						await interaction.deferReply();
						console.log(
							`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommandGroup()} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`
						);
						const region = interaction.options.getString('region');

						const nickname = validator.escape(
							interaction.options.getString('nickname')
						);

						// Obtain PUUID from nickname with tag
						const puuid = await Lol.getUserPuuid(nickname, region);
						if (puuid.error) {
							return interaction.editReply({ content: puuid.error });
						}

						await interaction.editReply(`Setting your nickname to: \`${nickname}\``);

						try {
							const row = await interaction.client.Users.create({
								user: interaction.user.id,
								riot_name: nickname,
								riot_region: region,
								riot_puuid: puuid,
							});

							return interaction.editReply(
								`Your League of Legends name is set to: \`${row.riot_name}\``
							);
						} catch (error) {
							if (error.name === 'SequelizeUniqueConstraintError') {
								interaction.editReply('User exist in database, updating nickname.');
								const affectedRows = await interaction.client.Users.update(
									{ riot_name: nickname, riot_region: region, riot_puuid: puuid },
									{ where: { user: interaction.user.id } }
								);

								if (affectedRows > 0) {
									return interaction.editReply(
										`Your new League of Legends name is \`${nickname}\`.`
									);
								}
							}

							console.log(error);
							return interaction.editReply(
								'Error: Something went wrong with setting your League of Legends name.'
							);
						}
					}

					case 'remove': {
						await interaction.deferReply();
						console.log(
							`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommandGroup()} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`
						);
						await interaction.editReply(
							'Deleting League of Legends username from database...'
						);

						// deletes user nickname from database
						const affectedRows = await interaction.client.Users.update(
							{ riot_name: '', riot_region: '', riot_puuid: '' },
							{ where: { user: interaction.user.id } }
						);

						if (affectedRows > 0) {
							return interaction.editReply('League of Legends name deleted.');
						}

						return interaction.editReply("That user doesn't exist in database.");
					}

					default: {
						return interaction.reply({
							content: 'Error: Missing subcommand.',
							ephemeral: true,
						});
					}
				}
			}

			default: {
				switch (interaction.options.getSubcommand()) {
					case 'np': {
						await interaction.deferReply();
						console.log(
							`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`
						);
						const user = interaction.options.getUser('user') ?? interaction.user;

						// Get user nickname from bot database
						const userData = await interaction.client.Users.findOne({
							where: { user: user.id },
						});
						if (!userData) {
							return interaction.editReply('ERROR: WIP - not in db');
						}
						if (!userData?.get('riot_puuid')) {
							return interaction.editReply('ERROR: WIP - not in db');
						}
						// TODO: check if puuid is empty, in other commands also
						const puuid = userData.get('riot_puuid');
						const region = userData.get('riot_region');
						const nickname = userData.get('riot_name');

						// Fetch match data
						const match = await Lol.getNowPlayingMatch(puuid, region);
						if (match.error) {
							return interaction.editReply({ content: match.error });
						}

						// Find correct player
						const playerInfo = match.participants.filter(
							(player) => player.puuid == puuid
						)[0];

						let gameTime = 'loading screen';
						if (match.gameLength > 0) {
							gameTime = secondsToHoursMinutes(match.gameLength);
						}

						const championName = Lol.getChampionNameById(playerInfo.championId);
						const summonerSpell1 = Lol.getSummonersNameById(playerInfo.spell1Id);
						const summonerSpell2 = Lol.getSummonersNameById(playerInfo.spell2Id);

						const gameEmbed = new EmbedBuilder()
							.setColor(0x0ba2ca)
							.setAuthor({
								name: playerInfo.riotId,
								iconURL: Lol.getProfileIcon(playerInfo.profileIconId),
								url: `https://www.leagueofgraphs.com/summoner/${Lol.regionCodeToName(region)}/${querystring.escape(nickname.replace('#', '-'))}`,
							})
							.setDescription(
								`
### Now playing: ${Lol.getQueueNameById(match.gameQueueConfigId)} (${gameTime})
**${championName}** ┃ summs:  ${summonerSpell1} | ${summonerSpell2}
- links:  [porofessor.gg](https://porofessor.gg/live/${Lol.regionCodeToName(region)}/${querystring.escape(nickname.replace('#', '-'))}) | [leagueofgraphs.com](https://www.leagueofgraphs.com/match/${Lol.regionCodeToName(region)}/${match.gameId})
`
							)
							.setThumbnail(Lol.getChampionAvatar(championName));

						return interaction.editReply({ embeds: [gameEmbed] });
					}

					case 'recent': {
						await interaction.deferReply();
						console.log(
							`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`
						);
						const user = interaction.options.getUser('user') ?? interaction.user;
						const amount = interaction.options.getInteger('amount') ?? 5;

						// Get puuid from db
						const userData = await interaction.client.Users.findOne({
							where: { user: user.id },
						});
						if (!userData) {
							return interaction.editReply('ERROR: WIP - not in db');
						}
						if (!userData?.get('riot_puuid')) {
							return interaction.editReply('ERROR: WIP - not in db');
						}
						// TODO: check if puuid is empty, in other commands also
						const puuid = userData.get('riot_puuid');
						const region = userData.get('riot_region');
						const nickname = userData.get('riot_name');

						// Get last games id
						const matchHistory = await Lol.getMatchHistory(puuid, region, amount);
						if (matchHistory.error) {
							return interaction.editReply({ content: matchHistory.error });
						}

						const historyEmbed = [];

						// Iterate over games id to fetch game info for embed
						for (const matchId of matchHistory) {
							// Fetch match data
							const match = await Lol.getMatch(matchId, region);
							if (match.error) {
								// return interaction.editReply({ content: match.error });
								continue;
							}
							// console.log(match);

							// Find correct player
							const playerInfo = match.info.participants.filter(
								(player) => player.puuid == puuid
							)[0];

							let positionName = playerInfo.teamPosition;

							// Fix for aram and 'utility' for support
							if (positionName.length > 0) {
								if (positionName === 'UTILITY') {
									positionName = 'SUPPORT';
								}
								positionName += ' ┃ ';
							}

							const gameEmbed = new EmbedBuilder()
								.setDescription(
									`
### ${Lol.getQueueNameById(match.info.queueId)} - ${playerInfo.win === true ? 'VICTORY' : 'DEFEAT'} (${secondsToHoursMinutes(match.info.gameDuration)})
${positionName}**${playerInfo.championName}** ┃ ${playerInfo.kills} / ${playerInfo.deaths} / ${playerInfo.assists} ┃ ${playerInfo.totalMinionsKilled + playerInfo.neutralMinionsKilled} cs
[leagueofgraphs.com](https://www.leagueofgraphs.com/match/${Lol.regionCodeToName(region)}/${match.info.gameId})
`
								)
								.setThumbnail(Lol.getChampionAvatar(playerInfo.championName));

							// Set embed color based on win/lose
							if (playerInfo.win === true) {
								gameEmbed.setColor(0x00ec93);
							} else {
								gameEmbed.setColor(0xff585d);
							}

							historyEmbed.push(gameEmbed);
						}

						if (historyEmbed.length === 0) {
							return interaction.editReply({
								content: 'Found 0 games in recent match history.',
							});
						}

						return interaction.editReply({
							content: `## ${nickname} last games:`,
							embeds: [...historyEmbed],
						});
					}

					case 'playing': {
						await interaction.deferReply();
						console.log(
							`-> New interaction: "${interaction.commandName} ${interaction.options.getSubcommand()}" by "${interaction.user.username}" on [${new Date().toString()}]`
						);

						const members = await interaction.guild.members.fetch();
						const membersIds = members.map((member) => member.user.id);
						const guild = await interaction.client.Users.findAll({
							where: { user: { [Sequelize.Op.in]: membersIds } },
						});

						if (guild.length == 0) {
							return await interaction.editReply(
								'No one on this server has submitted their nickname to the bot.'
							);
						}

						const requests = [];
						const requestUsersId = [];
						for (let i = 0; i < guild.length; i++) {
							const puuid = guild[i].dataValues.lol_puuid;
							const region = guild[i].dataValues.lol_region;

							// Fetch match data
							const match = await Lol.getNowPlayingMatch(puuid, region);
							if (match.error) {
								continue;
							}

							requestUsersId.push(guild[i].dataValues.user);
							requests.push(match);

							if (i == 24) {
								break;
							}
						}

						// const users = await Promise.all(requests).catch((error) => {
						// 	console.error(error);
						// 	return interaction.editReply('Error - WIP');
						// });

						// WIP

						return;
					}

					default: {
						return interaction.reply({
							content: 'Error: Missing subcommand.',
							ephemeral: true,
						});
					}
				}
			}
		}
	},
};
