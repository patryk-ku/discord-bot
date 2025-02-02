const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const util = require('util');
const validator = require('validator');
const helperFunctions = require('../../helpers/functions');
const exec = util.promisify(require('child_process').exec);
const { createWarningEmbed, createErrorEmbed } = require('../../helpers/functions.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('embed')
		.setDescription('Embeds video from given url (insta/reddit/twitter etc).')
		.addStringOption((option) =>
			option
				.setName('url')
				.setDescription('The url/link to page with video.')
				.setRequired(true)
		)
		.setDMPermission(false),
	async execute(interaction) {
		await interaction.deferReply();
		console.log(
			`-> New interaction: "${interaction.commandName}" by "${interaction.user.username}" on [${new Date().toString()}]`
		);
		const url = interaction.options.getString('url');

		// Validate if link
		if (!validator.isURL(url)) {
			console.log('Invalid url.');
			return await interaction.editReply(
				createWarningEmbed(`The given url: \`${url}\` is invalid.`)
			);
		}

		let link = url;
		if (!/^https?:\/\//i.test(url)) {
			link = 'https://' + link;
		}
		const twitterRegex = /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)(\/.*)?$/i;
		if (twitterRegex.test(link)) {
			link = link.replace(/(twitter|x)(?=\.com)/i, 'fixupx');
			return await interaction.editReply(link);
		}

		// Blacklisted urls (TODO: add more later)
		const blacklist = [
			{
				name: 'YouTube',
				regex: new RegExp(
					/^https?:\/\/(www\.)?(m\.)?(youtube|youtu)\.(com|be)(?:\/.*)?$/gm
				),
			},
			{
				name: 'Vimeo',
				regex: new RegExp(/^https?:\/\/(www\.)?(player\.)?(vimeo)\.com(?:\/.*)?$/gm),
			},
			{
				name: 'Twitch',
				regex: new RegExp(/^https?:\/\/(www\.)?(clips\.)?(twitch)\.tv(?:\/.*)?$/gm),
			},
		];
		for (const site of blacklist) {
			if (site.regex.test(url)) {
				return await interaction.editReply(
					createWarningEmbed(
						`Canceled download of: \`${url}\`. You do not need to use a bot to embed video from the **${site.name}** because videos from this site embed correctly on discord without any additional commands or utilites.`
					)
				);
			}
		}

		await interaction.editReply(`\`${url}\` is downloading...`);
		const name = String(Date.now());
		console.log(`ID: ${name}`);

		// in mb:
		const discordUploadLimit = 10;
		const maxFragments = 9;
		const maxFileSize = `${discordUploadLimit * maxFragments}M`;

		// Downloading video using yt-dlp
		try {
			const { error, stdout, stderr } = await exec(
				`yt-dlp "${url}" -o "./tmpfiles/${name}.%(ext)s" --max-filesize ${maxFileSize} --no-playlist -I 1 -f "(mp4)[vcodec!=h265][filesize<8M]+ba/(mp4)[vcodec!=h265]+ba/(mp4)+ba/(mp4)[vcodec!=h265][filesize<8M]/(mp4)[vcodec!=h265]/(mp4)"`
			);
			if (error) {
				console.log(error);
			}
			if (stderr) {
				console.log(stderr);
			}
			console.log(stdout);

			if (stdout.includes('File is larger than max-filesize')) {
				throw new Error('max-filesize');
			}
		} catch (error) {
			if (error?.stderr?.includes('ERROR: Unsupported URL')) {
				return await interaction.editReply(
					createErrorEmbed(`Unsupported URL. \`${url}\``, 'Download failed')
				);
			}
			console.log(`error: ${error.message}`);

			// Try to use external services if download failed
			const instaRegex = /^(https?:\/\/)?(www\.)?instagram\.com(\/.*)?$/i;
			if (instaRegex.test(link)) {
				link = link.replace('instagram', 'ddinstagram');
				return await interaction.editReply(link);
			}

			if (error.message == 'max-filesize') {
				return await interaction.editReply(
					createErrorEmbed(`Max file size exceeded. \`${url}\``, 'Download failed')
				);
			}

			return await interaction.editReply(
				createErrorEmbed(`Download failed. \`\`\`${url}\`\`\``)
			);
		}

		const filePath = `./tmpfiles/${name}.mp4`;

		let fileSize = await fs.promises.stat(filePath);
		fileSize = fileSize.size / (1024 * 1024);

		let embed;
		try {
			const { stdout } = await exec(`yt-dlp --dump-json "${url}"`);
			const json = JSON.parse(stdout);
			// console.log('title: ', json.title);
			// console.log('author: ', json.uploader);
			// console.log('site: ', json.webpage_url_domain);
			// console.log('description: ', json.description);
			// console.log('tags: ', json.tags);
			// console.log('timestamp: ', json.timestamp);
			// console.log('given url: ', url);
			// console.log('short url: ', json.webpage_url);

			embed = new EmbedBuilder();
			let descriptionString = '';

			if (json.title) {
				if (
					json.title !== json?.description &&
					json?.webpage_url_domain !== 'twitter.com'
				) {
					if (json.title.length > 256) {
						embed.setTitle(json.title.slice(0, 253) + '...');
					} else {
						embed.setTitle(json.title);
					}
				}
			}

			if (json.description) {
				descriptionString += json.description;
			}
			descriptionString = descriptionString.replace(/#(\w+)/g, ' `#$1` ');

			let shortUrl = url;
			if (json.webpage_url) {
				shortUrl = json.webpage_url;
			}
			descriptionString += `\n\`\`\`${shortUrl}\`\`\``;

			embed.setDescription(descriptionString);

			// footer
			let footerString = '';
			if (json.webpage_url_domain) {
				let webpage = json.webpage_url_domain;
				// Delete .com .net from end of site name and m. from the beginning
				webpage = webpage.replace(/\.com$|\.net$/i, '');
				webpage = webpage.replace(/^m\./, '');
				webpage = webpage.charAt(0).toUpperCase() + webpage.slice(1);
				footerString += webpage;
			}
			const footerObject = { text: footerString };
			switch (footerString) {
				case 'X':
				case 'Twitter':
					footerObject.text = 'Twitter';
					footerObject.iconURL =
						'https://upload.wikimedia.org/wikipedia/commons/f/f2/Logo_Twitter.png';
					embed.setColor('#169CF0');
					break;

				case 'Tiktok':
					footerObject.text = 'TikTok';
					footerObject.iconURL = 'https://i.imgur.com/AaYLyBC.png';
					embed.setColor('#00F2EA');
					break;

				case 'Reddit':
					footerObject.iconURL = 'https://i.imgur.com/fD625kA.png';
					embed.setColor('#FF4300');
					break;

				case 'Facebook':
					footerObject.iconURL =
						'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/2023_Facebook_icon.svg/240px-2023_Facebook_icon.svg.png';
					embed.setColor('#0065FF');
					break;

				case 'Instagram':
					footerObject.iconURL =
						'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png';
					embed.setColor('#DD297A');
					break;

				default:
					break;
			}
			if (json.uploader && json?.uploader?.length < 50) {
				if (footerObject.text.length > 0) {
					footerObject.text += ' ┃ by: ';
				}
				footerObject.text += json.uploader.replace(/\r?\n|\r/g, ' ');
			}
			embed.setFooter(footerObject);

			if (json.timestamp) {
				embed.setTimestamp(json.timestamp * 1000);
			}
		} catch (error) {
			console.log();
			console.log(error);
			embed = new EmbedBuilder()
				.setDescription(`\`\`\`${url}\`\`\``)
				.setFooter({ text: 'Requested video' });
		}

		// Spliting video into parts in needed:
		console.log('File size: ', fileSize);
		if (fileSize > discordUploadLimit) {
			console.log('Spliting video into parts.');
			try {
				const { error, stdout, stderr } = await exec(
					`helpers/split-video.sh ${filePath} ${discordUploadLimit * 1000000} "-c copy -hide_banner -loglevel error"`
				);
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

				return await interaction.editReply(
					createErrorEmbed(
						`Failed to split video into parts and due to the file weight limit, the whole file cannot be sent. \`${url}\``,
						'Download failed'
					)
				);
			}

			console.log('Video fragments:');
			const fragmentsList = [];
			for (let i = 1; i < maxFragments + 1; i++) {
				const fragmentPath = `./tmpfiles/${name}-${i}.mp4`;
				// Check if file exists
				try {
					await fs.promises.access(fragmentPath, fs.constants.F_OK);
					fragmentsList.push(fragmentPath);
					console.log(fragmentPath);
				} catch (_error) {
					break;
				}
			}

			await interaction.editReply(
				`Uploading \`${url}\` to discord in **${fragmentsList.length} parts** (because the ${discordUploadLimit}MB limit has been exceeded) please wait...`
			);

			console.log('Uploading files.');
			for (const [index, fragment] of fragmentsList.entries()) {
				const file = new AttachmentBuilder(fragment);
				try {
					if (index == 0) {
						await interaction.editReply({
							content: `### Part 1 of ${fragmentsList.length}`,
							files: [file],
						});
					} else {
						const messageObject = {
							content: `### Part ${index + 1} of ${fragmentsList.length}`,
							files: [file],
						};
						if (index + 1 == fragmentsList.length) {
							messageObject.embeds = [embed];
						}
						await interaction.followUp(messageObject);
					}
					console.log(`File sent succesfully: ${fragment}`);
				} catch (error) {
					await interaction.followUp(
						createErrorEmbed(
							`\`${url}\` - Failed to upload **part ${index}** of video to discord servers. Try again later.`
						)
					);
					console.log(error);
				}
			}

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

			await interaction.editReply({
				content: '',
				files: [file],
				embeds: [embed],
			});
			console.log('File sent succesfully');
		} catch (error) {
			await interaction.editReply(
				createErrorEmbed(`Failed to upload video to discord server. \`${url}\``)
			);

			console.log(error);
		}

		helperFunctions.deleteFile(filePath);
		return;
	},
};
