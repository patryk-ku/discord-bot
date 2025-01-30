const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getVoiceConnection, createAudioPlayer, AudioPlayerStatus } = require('@discordjs/voice');
const validator = require('validator');
const { createWarningEmbed, createErrorEmbed } = require('../../helpers/functions.js');
const { secondsToHoursMinutes } = require('../../helpers/functions.js');
const { playNextQueue, embedSmall } = require('../../helpers/voice.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Play music from a given link in a voice channel.')
		.addStringOption((option) =>
			option
				.setName('url')
				.setDescription('The url/link to page with song.')
				.setRequired(true)
		)
		.setDMPermission(true),
	async execute(interaction) {
		if (!process.env.VOICE_COMMANDS) {
			return interaction.reply('Voice commands are disabled.');
		}

		await interaction.deferReply();
		console.log(
			`-> New interaction: "${interaction.commandName}" by "${interaction.user.username}" on [${new Date().toString()}]`
		);

		const url = interaction.options.getString('url');

		// Validate given url
		if (!validator.isURL(url)) {
			console.log('Invalid url');
			return await interaction.editReply(
				createWarningEmbed(`The given url: \`${url}\` is invalid.`)
			);
		}

		const connection = getVoiceConnection(interaction.guild.id);

		if (!connection) {
			return await interaction.editReply(
				createWarningEmbed('The bot is not in any voice channel on this server')
			);
		}

		// Initiate new instance of player if not exists
		if (!connection.player) {
			console.log('Creating new player instance.');
			connection.player = createAudioPlayer();
			connection.subscribe(connection.player);
			connection.queue = [];

			// Player events
			connection.player.on(AudioPlayerStatus.Playing, () => {
				console.log('The audio player has started playing!');

				const embed = new EmbedBuilder()
					.setColor('#FF0000')
					.setTitle(connection.player.currentTrack.info.title)
					.setURL(connection.player.currentTrack.info.url)
					// .setDescription(
					// 	`${connection.player.currentTrack.info.author} ┃ ${secondsToHoursMinutes(connection.player.currentTrack.info.duration)} ┃ ${connection.player.currentTrack.info.views.toLocaleString('en')} views`
					// )
					.setDescription(
						`duration: **${secondsToHoursMinutes(connection.player.currentTrack.info.duration)}** │ views: **${connection.player.currentTrack.info.views.toLocaleString('pl')}**`
					)
					.setThumbnail(connection.player.currentTrack.info.thumbnail);

				interaction.channel.send({
					content: `**Now Playing in** <#${connection.joinConfig.channelId}>`,
					embeds: [embed],
				});
			});

			connection.player.on('error', async (error) => {
				console.log(error);

				await interaction.channel.send(createErrorEmbed(error));

				playNextQueue(connection.player, connection.queue);
			});

			connection.player.on(AudioPlayerStatus.Idle, (_oldState, _newState) => {
				// console.log('Voice idle, old state:');
				// console.log(oldState);
				// console.log('new state:');
				// console.log(newState);
				playNextQueue(connection.player, connection.queue);
			});
		}

		// Add track to queue
		connection.queue.push(url);
		console.log('queue: ', connection.queue);

		// Inform user about queue update
		interaction.editReply(embedSmall(`Added to queue: \`${url}\``));

		if (connection.player.state.status === AudioPlayerStatus.Playing) {
			// tmp
		} else {
			// if player is not playing play song now
			playNextQueue(connection.player, connection.queue);
		}
	},
};
