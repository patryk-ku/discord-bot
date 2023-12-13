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
				.setRequired(true))
		.addStringOption(option =>
			option.setName('compression')
				.setDescription('Use this if "Max file size exceeded" error.')
				.addChoices(
					{ name: 'Low', value: '1300k' },
					{ name: 'Medium', value: '1000k' },
					{ name: 'High', value: '700k' },
					{ name: 'Minecraft', value: '300k' },
				)),
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

		let maxFileSize = '8M';
		if (interaction.options.getString('compression')) {
			maxFileSize = '14M';
			if (interaction.options.getString('compression') == '1000k') {
				maxFileSize = '17M';
			} else if (interaction.options.getString('compression') == '700k') {
				maxFileSize = '20M';
			} else if (interaction.options.getString('compression') == '300k') {
				maxFileSize = '32M';
			}
		}

		// Downloading video using local yt-dlp
		try {
			const { error, stdout, stderr } = await execPromise(`yt-dlp "${url}" -o "./tmpfiles/${name}.%(ext)s" --max-filesize ${maxFileSize} -f "(mp4,webm)"`);
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

		let fileSize = await fs.promises.stat(filePath);
		fileSize = fileSize.size / (1024 * 1024);

		// Compression
		let filePath2 = '';
		if (interaction.options.getString('compression') && fileSize > 8) {
			try {
				await interaction.editReply('Reducing file size...');
				const { error, stdout, stderr } = await execPromise(`ffmpeg -i ${filePath} -vcodec libx264 -b:v ${interaction.options.getString('compression')} -acodec aac ./tmpfiles/${name}_compressed.mp4`);
				if (error) {
					console.log(error);
				}
				if (stderr) {
					console.log(stderr);
				}

				console.log(stdout);
				filePath2 = filePath;
				filePath = `./tmpfiles/${name}_compressed.mp4`;

			} catch (error) {
				console.log(`error: ${error.message}`);
				interaction.editReply(`\`${url}\` - Error: compression failed (╥﹏╥)`);
				return;
			}
		}

		let fileSize2 = await fs.promises.stat(filePath);
		fileSize2 = fileSize2.size / (1024 * 1024);
		if (fileSize2 > 8) {
			await interaction.editReply(`\`${url}\` - Error: File still too large (${fileSize2.toFixed(2)}MB / 8MB).`);
		} else {

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

		}

		// Deleting file
		fs.unlink(filePath, function (err) {
			if (err) {
				console.log(err);
			}
			console.log(`File ${filePath} deleted successfully`);
		});

		if (interaction.options.getString('compression')) {
			fs.unlink(filePath2, function (err) {
				if (err) {
					console.log(err);
				}
				console.log(`File ${filePath2} deleted successfully`);
			});
		}
	},
};