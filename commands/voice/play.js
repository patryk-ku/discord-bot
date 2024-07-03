const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
	getVoiceConnection,
	createAudioPlayer,
	createAudioResource,
	AudioPlayerStatus,
	// StreamType,
} = require('@discordjs/voice');
const validator = require('validator');
require('dotenv').config();
const ytdl = require('ytdl-core');

const { secondsToHoursMinutes } = require('../../helpers/functions.js');

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
			return interaction.editReply(`\`${url}\` is invalid url.`);
		}

		// Function to play next url from queue
		async function playNextQueue(player, queue) {
			// Exit if queue empty
			if (queue.length < 1) {
				console.log('queue empty');

				const embed = new EmbedBuilder()
					.setColor('#5CACEC')
					.setDescription(':musical_note: **Queue empty**');
				interaction.channel.send({
					embeds: [embed],
				});

				return;
			}

			// Get yt stream
			const stream = ytdl(queue.at(0), { filter: 'audioonly', quality: 'highestaudio' });
			player.currentTrack = { url: queue.at(0) };
			queue.shift();

			// Get track info for rich embed
			const trackInfo = await ytdl.getBasicInfo(player.currentTrack.url);
			// console.log(trackInfo);
			// console.log(trackInfo.videoDetails.thumbnails);
			player.currentTrack.info = {
				url: trackInfo.videoDetails.video_url,
				title: trackInfo.videoDetails.title,
				author: trackInfo.videoDetails.ownerChannelName,
				duration: trackInfo.videoDetails.lengthSeconds,
				views: trackInfo.videoDetails.viewCount,
				thumbnail: trackInfo.videoDetails.thumbnails.at(-2).url,
			};

			// Create stream and play it
			const resource = createAudioResource(stream, {
				// inputType: StreamType.OggOpus,
				// inputType: StreamType.WebmOpus,
			});
			player.play(resource);
		}

		const connection = getVoiceConnection(interaction.guild.id);

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
					.setDescription(
						`${connection.player.currentTrack.info.author} ┃ ${secondsToHoursMinutes(connection.player.currentTrack.info.duration)} ┃ ${connection.player.currentTrack.info.views} views`
					)
					.setThumbnail(connection.player.currentTrack.info.thumbnail);

				interaction.channel.send({
					content: `**Now Playing in** <#${connection.joinConfig.channelId}>`,
					embeds: [embed],
				});
			});

			connection.player.on('error', (error) => {
				console.log(error);
				playNextQueue(connection.player, connection.queue);
			});

			connection.player.on(AudioPlayerStatus.Idle, (oldState, newState) => {
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
		const embed = new EmbedBuilder()
			.setColor('#5CACEC')
			.setDescription(`:musical_note: **Added to queue:**\n\`${url}\``);
		interaction.editReply({
			embeds: [embed],
		});

		if (connection.player.state.status === AudioPlayerStatus.Playing) {
			// tmp
		} else {
			// if player is not playing play song now
			playNextQueue(connection.player, connection.queue);
		}
	},
};
