exports.getNowPlaying = async (user, nickname) => {
	let nowPlaying;
	try {
		nowPlaying = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${nickname}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=1`)
			.then(res => {
				if (!res.ok) {
					throw new Error(res.statusText);
				}
				return res;
			})
			.then((res) => res.json())
			.catch(error => { throw new Error(error); });
	} catch (error) {
		return { error: `Failed to fetch now playing data - \`${error}\`` };
	}

	if (nowPlaying.error) {
		if (nowPlaying.error == 6) {
			return { error: `Last.fm error response: User \`${nickname}\` not found 💀` };
		} else {
			return { error: 'Unknown Last.fm API error 🔥' };
		}
	}

	if (!nowPlaying.recenttracks) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (!nowPlaying.recenttracks.track[0]) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (nowPlaying.recenttracks['@attr'].total == '0') {
		return { error: this.msg.noData(user, nickname) };
	}

	return nowPlaying.recenttracks;
};

exports.msg = {
	missingUsername: (user) => {
		return `Could not find ${user} last.fm nickname in a bot database. Use \`lastfm nickname set\` command to submit your nickname.`;
	},
	notPlayingNow: (user, nickname) => {
		return `${user} (\`${nickname}\`) is not listening to anything right now. 🔇`;
	},
	noData: (user, nickname) => {
		return `No scrobble data for ${user} (nick: \`${nickname}\`)`;
	},
};