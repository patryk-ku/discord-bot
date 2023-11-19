const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('node:fs');
const { exec } = require('child_process');
const util = require('util');
const validator = require('validator');
// promisify exec:
const execPromise = util.promisify(exec);

module.exports = {
	data: new SlashCommandBuilder()
		.setName('embed')
		.setDescription('Embeds video from given url (insta/reddit/twitter etc).')
		.addStringOption(option =>
			option.setName('url')
				.setDescription('The url/link to page with video.')
				.setRequired(true)),
	async execute(interaction) {
		await interaction.deferReply();
		console.log('-> New interaction: "embed"');
		const url = interaction.options.getString('url');

		// Validate if link
		if (!validator.isURL(url)) {
			console.log('Invalid url');
			interaction.editReply(`\`${url}\` is invalid url.`);
			return;
		}

		await interaction.editReply(`\`${url}\` is downloading...`);
		const name = String(Date.now());
		console.log(`ID: ${name}`);

		// Downloading video using local yt-dlp
		try {
			const { error, stdout, stderr } = await execPromise(`yt-dlp "${url}" -o "./tmpfiles/${name}.%(ext)s" --max-filesize 8M -f "(mp4,webm)"`);
			if (error) {
				console.log(error);
			}
			if (stderr) {
				console.log(stderr);
			}

			console.log(stdout);
			if (stdout.includes('File is larger than max-filesize')) {
				interaction.editReply(`\`${url}\` - Download failed (╥﹏╥). Max file size exceeded.`);
				return;
			}
		} catch (error) {
			console.log(`error: ${error.message}`);
			interaction.editReply(`\`${url}\` - Download failed (╥﹏╥)`);
			return;
		}

		// Finding right file extension (.mp4 or .webm)
		let filePath = '';
		if (fs.existsSync(`./tmpfiles/${name}.mp4`)) {
			filePath = `./tmpfiles/${name}.mp4`;
		} else if (fs.existsSync(`./tmpfiles/${name}.webm`)) {
			filePath = `./tmpfiles/${name}.webm`;
		} else {
			await interaction.editReply(`\`${url}\` - Error, failed to download file.`);
			return;
		}

		// Uploading file to discord
		const file = new AttachmentBuilder(filePath);
		try {
			console.log(`Uploading file: ${filePath}`);
			await interaction.editReply('Uploading file to discord...');
			await interaction.editReply({ content: `\`${url}\``, files: [file] });
			console.log('File sent succesfully');
		} catch (error) {
			await interaction.editReply(`\`${url}\` - Error, failed to upload video to discord servers.`);
			console.log(error);
		}

		// Deleting file
		fs.unlink(filePath, function(err) {
			if (err) {
				return console.log(err);
			}
			console.log(`File ${filePath} deleted successfully`);
		});
	},
};