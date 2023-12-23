const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('node:fs');
const { exec } = require('child_process');
const util = require('util');
const validator = require('validator');
const helperFunctions = require('../../helpers/functions');
// promisify exec:
const execPromise = util.promisify(exec);

module.exports = {
	data: new SlashCommandBuilder()
		.setName('embed')
		.setDescription('Embeds video from given url (insta/reddit/twitter etc).')
		.addStringOption(option =>
			option.setName('url')
				.setDescription('The url/link to page with video.')
				.setRequired(true))
		.setDMPermission(false),
	async execute(interaction) {
		await interaction.deferReply();
		console.log(`-> New interaction: "${interaction.commandName}" by "${interaction.user.username}" on [${new Date().toString()}]`);
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

		// in mb:
		const discordUploadLimit = 8;
		const maxFragments = 9;
		const maxFileSize = `${discordUploadLimit * maxFragments}M`;

		// Downloading video using yt-dlp
		try {
			const { error, stdout, stderr } = await execPromise(`yt-dlp "${url}" -o "./tmpfiles/${name}.%(ext)s" --max-filesize ${maxFileSize} -f "(mp4)"`);
			if (error) {
				console.log(error);
			}
			if (stderr) {
				console.log(stderr);
			}

			console.log(stdout);
			if (stdout.includes('File is larger than max-filesize')) {
				return interaction.editReply(`\`${url}\` - ❌ Download failed (╥﹏╥). Max file size exceeded.`);
			}
		} catch (error) {
			if (error.stderr.includes('ERROR: Unsupported URL')) {
				return interaction.editReply(`\`${url}\` - ❌ Download failed (╥﹏╥). Unsupported URL.`);
			}
			console.log(`error: ${error.message}`);
			return interaction.editReply(`\`${url}\` - ❌ Download failed (╥﹏╥)`);
		}

		const filePath = `./tmpfiles/${name}.mp4`;

		let fileSize = await fs.promises.stat(filePath);
		fileSize = fileSize.size / (1024 * 1024);

		// Spliting video into parts in needed:
		if (fileSize > discordUploadLimit) {
			console.log('Spliting video into parts.');
			try {
				const { error, stdout, stderr } = await execPromise(`MP4Box -splits ${discordUploadLimit * 1000} ${filePath}`);
				if (error) {
					console.log(error);
				}
				if (stderr) {
					console.log(stderr);
				}
				console.log(stdout);
			} catch (error) {
				console.log(`error: ${error}`);
				helperFunctions.deleteFile(filePath);
				return interaction.editReply('Failed to split video into parts and due to the file weight limit, the whole file cannot be sent.');
			}

			console.log('Video fragments:');
			const fragmentsList = [];
			for (let i = 1; i < maxFragments + 1; i++) {
				const fragmentPath = `./tmpfiles/${name}_00${i}.mp4`;
				// Check if file exists
				try {
					await fs.promises.access(fragmentPath, fs.constants.F_OK);
					fragmentsList.push(fragmentPath);
					console.log(fragmentPath);
				} catch (error) {
					break;
				}
			}

			await interaction.editReply(`Uploading \`${url}\` to discord in **${fragmentsList.length} parts** (because the ${discordUploadLimit}MB limit has been exceeded) please wait...`);

			console.log('Uploading files.');
			for (const [index, fragment] of fragmentsList.entries()) {
				const file = new AttachmentBuilder(fragment);
				try {
					await interaction.followUp({ content: `## Part ${index + 1}`, files: [file] });
					console.log(`File sent succesfully: ${fragment}`);
				} catch (error) {
					await interaction.followUp(`\`${url}\` - Error, failed to upload **part ${index}** of video to discord servers. Try again.`);
					console.log(error);
				}
			}

			await interaction.followUp('Entire video sent succesfully.');
			console.log('Entire video sent succesfully.');
			helperFunctions.deleteFile(filePath);
			helperFunctions.deleteMultipleFiles(fragmentsList);
			return;
		}

		// Uploading file to discord if entire video < discordFileLimit
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

		helperFunctions.deleteFile(filePath);
		return;
	},
};