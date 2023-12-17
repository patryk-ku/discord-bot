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
			return { error: `Unknown Last.fm API error 🔥 \`${nowPlaying}\`` };
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

exports.getTopArtists = async (user, nickname, period, limit) => {
	let topArtists;
	try {
		topArtists = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${nickname}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=${limit}&period=${period}`)
			.then(res => {
				if (!res.ok) {
					throw new Error(res.statusText);
				}
				return res;
			})
			.then((res) => res.json())
			.catch(error => { throw new Error(error); });
	} catch (error) {
		return { error: `Failed to fetch ${user} top artists - \`${error}\`` };
	}

	if (topArtists.error) {
		if (topArtists.error == 6) {
			return { error: `Last.fm error response: User \`${nickname}\` not found 💀` };
		} else {
			return { error: `Unknown Last.fm API error 🔥 \`${topArtists}\`` };
		}
	}

	if (!topArtists.topartists) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (!topArtists.topartists.artist[0]) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (topArtists.topartists.artist == 0) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (topArtists.topartists['@attr'].total == '0') {
		return { error: this.msg.noData(user, nickname) };
	}

	return topArtists.topartists;
};

exports.getTopAlbums = async (user, nickname, period, limit) => {
	let topAlbums;
	try {
		topAlbums = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${nickname}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=${limit}&period=${period}`)
			.then(res => {
				if (!res.ok) {
					throw new Error(res.statusText);
				}
				return res;
			})
			.then((res) => res.json())
			.catch(error => { throw new Error(error); });
	} catch (error) {
		return { error: `Failed to fetch ${user} top albums - \`${error}\`` };
	}

	if (topAlbums.error) {
		if (topAlbums.error == 6) {
			return { error: `Last.fm error response: User \`${nickname}\` not found 💀` };
		} else {
			return { error: `Unknown Last.fm API error 🔥 \`${topAlbums}\`` };
		}
	}

	if (!topAlbums.topalbums) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (!topAlbums.topalbums.album[0]) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (topAlbums.topalbums.album == 0) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (topAlbums.topalbums['@attr'].total == '0') {
		return { error: this.msg.noData(user, nickname) };
	}

	return topAlbums.topalbums;
};

exports.getTopTracks = async (user, nickname, period, limit) => {
	let topTracks;
	try {
		topTracks = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${nickname}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=${limit}&period=${period}`)
			.then(res => {
				if (!res.ok) {
					throw new Error(res.statusText);
				}
				return res;
			})
			.then((res) => res.json())
			.catch(error => { throw new Error(error); });
	} catch (error) {
		return { error: `Failed to fetch ${user} top tracks - \`${error}\`` };
	}

	if (topTracks.error) {
		if (topTracks.error == 6) {
			return { error: `Last.fm error response: User \`${nickname}\` not found 💀` };
		} else {
			return { error: `Unknown Last.fm API error 🔥 \`${topTracks}\`` };
		}
	}

	if (!topTracks.toptracks) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (!topTracks.toptracks.track[0]) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (topTracks.toptracks.track == 0) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (topTracks.toptracks['@attr'].total == '0') {
		return { error: this.msg.noData(user, nickname) };
	}

	console.log(topTracks);
	return topTracks.toptracks;
};

exports.str = {
	range: (range) => {
		if (range == '7day') {
			return 'week';
		} else if (range == '1month') {
			return 'month';
		} else if (range == '12month') {
			return 'year';
		} else if (range == 'overall') {
			return 'all time';
		} else {
			throw new Error('Invalid time range name.');
		}
	},
};

exports.msg = {
	missingUsername: (user) => {
		return `Could not find ${user} last.fm nickname in a bot database. Use \`lastfm nickname set\` command to submit your nickname.`;
	},
	notPlayingNow: (user, nickname) => {
		return `${user} (\`${nickname}\`) is not listening to anything right now. 🔇`;
	},
	noData: (user, nickname) => {
		return `No required scrobble data for ${user} (nick: \`${nickname}\`)`;
	},
	apiDisabled: () => {
		return 'Last.fm commands are **disabled** because the bot owner did not provided an Last.fm API key.';
	},
};