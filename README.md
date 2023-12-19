# discord-bot
Simple self-hosted multipurpose Discord bot designed for use in small/private discord servers.

## Commands

### Last.fm

| command | description |
| ----------- | ----------- |
| `/lastfm nickname set` | Set or update your lastfm nickname. |
| `/lastfm nickname remove` | Delete your lastfm nickname from bot database. |
| `/lastfm nickname lock` | Prevent the server admins from changing your nickname. |
| `/np` | Replies with your now playing song. |
| `/playing` | Replies with every server user now playing song (max 25 users). |
| `/lastfm recent` | Replies with user recently scrobbled songs. |
| `/yt` | Replies with first video from youtube search of user now playing song. |
| `/lastfm collage` | Replies with user top albums collage. |
| `/lastfm top artists` | Replies with user top artists chart. |
| `/lastfm top albums` | Replies with user top albums chart. |
| `/lastfm top tracks` | Replies with user top tracks chart. |
| `/lastfm profile` | Replies with user last.fm profile summary. |

### Listenbrainz

| command | description |
| ----------- | ----------- |
| `/listenbrainz nickname set` | Set or update your listenbrainz nickname. |
| `/listenbrainz nickname remove` | Delete your listenbrainz nickname from bot database. |
| `/listenbrainz np` | Replies with your now playing song. |
| `/listenbrainz cover` | Replies with high-res cover art of user now playing song (from listenbrainz). |

### Utility

| command | description |
| ----------- | ----------- |
| `/embed` | Embeds video from given url (insta/reddit/twitter etc). |
| `/avatar` | Embeds avatar image of given user. |

### Administrator commands

They require administrator privileges on the server

| command | description |
| ----------- | ----------- |
| `/admin lastfm set` | Set or update last.fm nickname of given user. |
| `/admin lastfm remove` | Delete lastfm nickname of given user from bot database. |
| `/admin lastfm users` | List all last.fm users from this server. |

### Configuration commands

These commands can only be used by the owner of an instance of this bot

| command | description |
| ----------- | ----------- |
| `/config status` | Set bot status. |
| `/config activity` | Set bot activity. |

## Requirements

- Node.js v18 or higher
- yt-dlp (for `/embed` command)
- MP4Box (for `/embed` command, optional in some cases)
- Any modern linux instalation (for now this bot is linux only, may change later)

## Installation and setup

1. Go to [Discord Developer Portal](https://discord.com/developers) and create new application with bot. Get here `APPLICATION ID` and `BOT TOKEN` and copy them to `.env.example` file.
2. Discord bot permissions:

	(WIP)

3. For last.fm features you need to obtain their API key [here](https://www.last.fm/api/account/create). For Listenbrainz features you need your profile token from [here](https://listenbrainz.org/profile/).
4. Clone repository and rename `.env.example` to `.env`

	```sh
	mv .env.example .env
	```

	Now insert all API keys and tokens into `.env` file. Some are optional, check comments inside file for more info.

5. Run

	```sh
	npm install --omit=dev
	```

6. If you want the bot commands to work on only one server:
	
	- Uncomment `DISCORD_GUILD_ID` in `.env` and insert your server id here

	and run

	```sh
	npm run deploy-commands
	```

	If you want the bot commands to work on multiple servers:

	run

	```sh
	npm run deploy-global-commands 
	```

7. Finally to start the bot

	```sh
	npm run start
	```

	If you did everything correctly, you should see in the terminal:

	```
	Ready! Logged in as your-bot-name#and-id
	Connection to database has been established successfully.
	```
	To restart bot use:

	```sh
	npm run restart
	```

	To stop bot:

	```sh
	npm run stop
	```

## Made with

- [Node.js](https://nodejs.org/)
- [Discord.js](https://discord.js.org/)
- [Sequelize](https://sequelize.org/)
- [SQLite](https://www.sqlite.org/)