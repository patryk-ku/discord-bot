const { SlashCommandBuilder } = require('discord.js');
const { VoiceConnectionStatus, entersState, getVoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const { createReadStream } = require('node:fs');
const validator = require('validator');
require('dotenv').config();
const helperFunctions = require('../../helpers/functions');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Play music from a given link in a voice channel.')
		.addStringOption(option =>
			option.setName('url')
				.setDescription('The url/link to page with song.')
				.setRequired(true))
		.setDMPermission(true),
	async execute(interaction) {
		if (!process.env.VOICE_COMMANDS) {
			return interaction.reply('Voice commands are disabled.');
		}

		await interaction.deferReply();
		console.log(`-> New interaction: "${interaction.commandName}" by "${interaction.user.username}" on [${new Date().toString()}]`);

		const url = interaction.options.getString('url');
		// Validate if link
		if (!validator.isURL(url)) {
			console.log('Invalid url');
			return interaction.editReply(`\`${url}\` is invalid url.`);
		}

		const connection = getVoiceConnection(interaction.guild.id);

		if (connection.lastSongPath) {
			helperFunctions.deleteFile(connection.lastSongPath);
		}

		const player = createAudioPlayer();

		// Downloading song
		const name = String(Date.now());
		console.log(`ID: ${name}`);
		const fileName = `./tmpfiles/${name}.opus`;
		try {
			// Todo: Also test here "-S +size" or "-f worst":
			const { error, stdout, stderr } = await execPromise(`yt-dlp "${url}" -o "${fileName}" --max-filesize 10M -x --audio-format opus -S +size`);
			if (error) {
				console.log(error);
			}
			if (stderr) {
				console.log(stderr);
			}

			console.log(stdout);
			if (stdout.includes('File is larger than max-filesize')) {
				return interaction.editReply(`\`${url}\` - Max file size exceeded.`);
			}
		} catch (error) {
			console.log(`error: ${error.message}`);
			return interaction.editReply(`\`${url}\` - Failed to play song (╥﹏╥)`);
		}

		// const resource = createAudioResource('./tmpfiles/music.opus');
		const resource = createAudioResource(createReadStream(fileName, {
			inputType: StreamType.OggOpus,
		}));

		player.play(resource);

		// Play "track.mp3" across two voice connections
		connection.subscribe(player);

		player.on(AudioPlayerStatus.Playing, () => {
			console.log('The audio player has started playing!');
			interaction.editReply(`Playing: \`${url}\` in voice channel.`);
			connection.lastSongPath = fileName;
		});

		player.on('error', error => {
			console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
			// player.play(getNextResource());
		});

		player.on(AudioPlayerStatus.Idle, (oldState, newState) => {
			// console.log('Now idle, old state:');
			// console.log(oldState);
			// console.log('new state:');
			// console.log(newState);

			console.log(`Finished playing: ${fileName}`);
			helperFunctions.deleteFile(fileName);
			delete connection.lastSongPath;
		});

		connection.on(VoiceConnectionStatus.Destroyed, (oldState, newState) => {
			console.log(`Interupted playing: ${fileName}`);
			helperFunctions.deleteFile(fileName);
		});
	},
};