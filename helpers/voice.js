const { EmbedBuilder } = require('discord.js');
const { createAudioResource } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

exports.embedSmall = (text) => {
	const embed = new EmbedBuilder()
		.setColor('#5CACEC')
		.setDescription(`:musical_note: **${text}**`);
	return { content: '', embeds: [embed] };
};

exports.playNextQueue = async (player, queue) => {
	// Exit if queue empty
	if (queue.length < 1) {
		console.log('queue empty');
		return;
	}

	// Get yt stream
	const stream = ytdl(queue.at(0), {
		filter: 'audioonly',
		quality: 'highestaudio',
		highWaterMark: 1 << 25,
	});
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
		views: Number(trackInfo.videoDetails.viewCount),
		thumbnail: trackInfo.videoDetails.thumbnails.at(-2).url,
	};

	// Create stream and play it
	const resource = createAudioResource(stream, {
		// inputType: StreamType.OggOpus,
		// inputType: StreamType.WebmOpus,
	});
	player.play(resource);
};
