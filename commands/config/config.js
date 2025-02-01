const { SlashCommandBuilder, ActivityType, EmbedBuilder } = require('discord.js');
require('dotenv').config();
const util = require('util');
const exec = util.promisify(require('child_process').exec);

module.exports = {
	data: new SlashCommandBuilder()
		.setName('config')
		.setDescription('Bot config commands')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('status')
				.setDescription('Set bot status.')
				.addStringOption((option) =>
					option
						.setName('status')
						.setDescription('Status option.')
						.addChoices(
							{ name: 'online', value: 'online' },
							{ name: 'idle', value: 'idle' },
							{ name: 'dnd', value: 'dnd' },
							{ name: 'invisible', value: 'invisible' }
						)
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('activity')
				.setDescription('Set bot activity.')
				.addStringOption((option) =>
					option
						.setName('string')
						.setDescription('Activity string, to clear omit this option.')
				)
				.addStringOption((option) =>
					option
						.setName('type')
						.setDescription('Activity type.')
						.addChoices(
							{ name: 'Playing', value: 'Playing' },
							{ name: 'Watching', value: 'Watching' },
							{ name: 'Listening', value: 'Listening' },
							{ name: 'Competing', value: 'Competing' },
							{ name: 'Custom', value: 'Custom' }
						)
				)
		)
		.addSubcommand((subcommand) => subcommand.setName('restart').setDescription('Restart bot.'))
		.addSubcommand((subcommand) =>
			subcommand.setName('update').setDescription('Git pull from current branch.')
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('branch')
				.setDescription('Change git branch. ')
				.addStringOption((option) =>
					option
						.setName('name')
						.setDescription('Branch name')
						.addChoices({ name: 'main', value: 'main' }, { name: 'dev', value: 'dev' })
						.setRequired(true)
				)
		)
		.setDefaultMemberPermissions(0)
		.setDMPermission(true),
	async execute(interaction) {
		if (interaction.user.id != process.env.OWNER_ID) {
			return interaction.reply(
				'These commands can only be used by the owner of an instance of this bot'
			);
		}

		switch (interaction.options.getSubcommand()) {
			case 'status': {
				await interaction.deferReply();
				const status = interaction.options.getString('status');
				interaction.client.user.setStatus(status);
				return interaction.editReply(`Bot status set to: **${status}**.`);
			}

			case 'activity': {
				await interaction.deferReply();
				const str = interaction.options.getString('string');
				const type = interaction.options.getString('type');

				if (!type) {
					// await interaction.client.user.setActivity(str);
					await interaction.client.user.setActivity(str, { type: ActivityType.Custom });
					return interaction.editReply(`Bot activity set to: **${str}**.`);
				}

				if (!str) {
					return interaction.editReply(
						'Activity string cannot be empty to set activity type.'
					);
				}

				if (type == 'Watching') {
					await interaction.client.user.setActivity(str, { type: ActivityType.Watching });
				} else if (type == 'Listening') {
					await interaction.client.user.setActivity(str, {
						type: ActivityType.Listening,
					});
				} else if (type == 'Competing') {
					await interaction.client.user.setActivity(str, {
						type: ActivityType.Competing,
					});
				} else if (type == 'Playing') {
					await interaction.client.user.setActivity(str, { type: ActivityType.Playing });
				} else if (type == 'Custom') {
					await interaction.client.user.setActivity(str, { type: ActivityType.Custom });
				}

				return interaction.editReply(
					`Bot activity type set to: **${type}**. Bot status set to: **${str}**.`
				);
			}

			case 'restart': {
				await interaction.reply('Restarting...');
				process.exit();
			}

			case 'update': {
				await interaction.deferReply();

				const embed = new EmbedBuilder().setDescription(
					'Executing `git pull`, please wait...'
				);

				await interaction.editReply({ embeds: [embed] });

				let stdout, stderr;

				// First pull updates from current branch
				try {
					({ stdout, stderr } = await exec('git pull'));
				} catch (error) {
					embed.setDescription(`### Error:\n \`\`\`${error}\`\`\``);
					return await interaction.editReply({ embeds: [embed] });
				}

				// TODO: git commands outputs to stderr even if there is no error
				// if (stderr.length > 0) {
				// 	embed.setDescription(`### Error:\n \`\`\`${stdout}\`\`\``);
				// 	return await interaction.editReply({ embeds: [embed] });
				// }

				const output = `### \`git pull\` output:\n \`\`\`${stdout + stderr}\`\`\``;

				// Return if no updates
				if (stdout.includes('Already up to date.')) {
					embed.setDescription(output);
					return await interaction.editReply({ embeds: [embed] });
				}

				embed.setDescription(`${output}\nRefreshing commands, please wait...`);
				await interaction.editReply({ embeds: [embed] });

				// TODO: fix also for 'local' commands
				// Then refresh commands (works only with global commands)
				try {
					({ stdout, stderr } = await exec('pnpm run deploy-global-commands'));
				} catch (error) {
					embed.setDescription(
						`${output}\n### Refresh commands error:\n \`\`\`${error}\`\`\``
					);
					return await interaction.editReply({ embeds: [embed] });
				}

				if (stderr.length > 0) {
					embed.setDescription(
						`${output}\n### Refresh commands error:\n \`\`\`${stderr}\`\`\``
					);
					return await interaction.editReply({ embeds: [embed] });
				}

				embed.setDescription(
					`${output}\n### \`pnpm run deploy-global-commands\` output:\n \`\`\`${stdout}\`\`\` \n### Update completed.\nAfter a successful update, manually run the </config restart:1186353226811969728> command.`
				);
				await interaction.editReply({ embeds: [embed] });

				return;
			}

			case 'branch': {
				await interaction.deferReply();
				const name = interaction.options.getString('name');

				const embed = new EmbedBuilder().setDescription(
					`Executing \`git checkout ${name}\`, please wait...`
				);

				await interaction.editReply({ embeds: [embed] });

				let stdout, stderr;

				try {
					({ stdout, stderr } = await exec(`git checkout ${name}`));
				} catch (error) {
					embed.setDescription(`### Error:\n \`\`\`${error}\`\`\``);
					return await interaction.editReply({ embeds: [embed] });
				}

				// TODO: fix later when steerr
				// if (stderr.length > 0) {
				// 	embed.setDescription(`### Error:\n \`\`\`${stdout}\`\`\``);
				// 	return await interaction.editReply({ embeds: [embed] });
				// }

				embed.setDescription(
					`### \`git checkout ${name}\` output:\n \`\`\`${stdout + stderr}\`\`\` \nAfter a successful branch change, manually run the </config update:1186353226811969728> command.`
				);
				await interaction.editReply({ embeds: [embed] });

				return;
			}

			default: {
				return interaction.reply({
					content: 'Error: Missing subcommand.',
					ephemeral: true,
				});
			}
		}
	},
};
