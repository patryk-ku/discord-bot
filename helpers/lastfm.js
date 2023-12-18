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
		return { error: this.msg.fetchError(error) };
	}

	if (nowPlaying.error) {
		if (nowPlaying.error == 6) {
			return { error: this.msg.userNotFound(nickname) };
		} else {
			return { error: this.msg.unknownApiError(nowPlaying) };
		}
	}

	if (!nowPlaying.recenttracks) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (!nowPlaying.recenttracks.track[0]) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (nowPlaying.recenttracks.track.length == 0) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (nowPlaying.recenttracks['@attr'].total == '0') {
		return { error: this.msg.noData(user, nickname) };
	}

	return nowPlaying.recenttracks;
};

exports.getRecentTracks = async (user, nickname, limit) => {
	let recentTracks;
	try {
		recentTracks = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${nickname}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=${limit}`)
			.then(res => {
				if (!res.ok) {
					throw new Error(res.statusText);
				}
				return res;
			})
			.then((res) => res.json())
			.catch(error => { throw new Error(error); });
	} catch (error) {
		return { error: this.msg.fetchError(error) };
	}

	if (recentTracks.error) {
		if (recentTracks.error == 6) {
			return { error: this.msg.userNotFound(nickname) };
		} else {
			return { error: this.msg.unknownApiError(recentTracks) };
		}
	}

	if (!recentTracks.recenttracks) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (!recentTracks.recenttracks.track[0]) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (recentTracks.recenttracks.track.length == 0) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (recentTracks.recenttracks['@attr'].total == '0') {
		return { error: this.msg.noData(user, nickname) };
	}

	return recentTracks.recenttracks;
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
		return { error: this.msg.fetchError(error) };
	}

	if (topArtists.error) {
		if (topArtists.error == 6) {
			return { error: this.msg.userNotFound(nickname) };
		} else {
			return { error: this.msg.unknownApiError(topArtists) };
		}
	}

	if (!topArtists.topartists) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (!topArtists.topartists.artist[0]) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (topArtists.topartists.artist.length == 0) {
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
		return { error: this.msg.fetchError(error) };
	}

	if (topAlbums.error) {
		if (topAlbums.error == 6) {
			return { error: this.msg.userNotFound(nickname) };
		} else {
			return { error: this.msg.unknownApiError(topAlbums) };
		}
	}

	if (!topAlbums.topalbums) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (!topAlbums.topalbums.album[0]) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (topAlbums.topalbums.album.length == 0) {
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
		return { error: this.msg.fetchError(error) };
	}

	if (topTracks.error) {
		if (topTracks.error == 6) {
			return { error: this.msg.userNotFound(nickname) };
		} else {
			return { error: this.msg.unknownApiError(topTracks) };
		}
	}

	if (!topTracks.toptracks) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (!topTracks.toptracks.track[0]) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (topTracks.toptracks.track.length == 0) {
		return { error: this.msg.noData(user, nickname) };
	}

	if (topTracks.toptracks['@attr'].total == '0') {
		return { error: this.msg.noData(user, nickname) };
	}

	return topTracks.toptracks;
};

exports.getUserInfo = async (user, nickname) => {
	let userInfo;
	try {
		userInfo = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${nickname}&api_key=${process.env.LASTFM_API_KEY}&format=json`)
			.then(res => {
				if (!res.ok) {
					throw new Error(res.statusText);
				}
				return res;
			})
			.then((res) => res.json())
			.catch(error => { throw new Error(error); });
	} catch (error) {
		return { error: this.msg.fetchError(error) };
	}

	if (userInfo.error) {
		if (userInfo.error == 6) {
			return { error: this.msg.userNotFound(nickname) };
		} else {
			return { error: this.msg.unknownApiError(userInfo) };
		}
	}

	if (!userInfo.user) {
		return { error: this.msg.noData(user, nickname) };
	}

	console.log(userInfo);
	return userInfo.user;
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
	userNotFound: (nickname) => {
		return `Last.fm error response: User \`${nickname}\` not found 💀`;
	},
	unknownApiError: (error) => {
		return `Unknown Last.fm API error 🔥 - \`${error}\``;
	},
	fetchError: (error) => {
		return `Failed to fetch data from Last.fm servers - \`${error}\``;
	},
};