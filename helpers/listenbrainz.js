exports.getCoverArt = async (mbid, size = 500) => {
	let coverArt;

	// The current supported thumbnail sizes are 250px, 500px, and 1200px.
	// Use "9999" for maximum available resolution.
	// If the size is not provided or the resolution is incorrect, 500px will be selected.

	if (size == 250 || size == 500 || size == 1200) {
		size = `-${size}`;
	} else if (size == 9999) {
		size = '';
	} else {
		size = '-500';
	}

	try {
		coverArt = await fetch(`http://coverartarchive.org/release/${mbid}/front${size}`)
			.then(res => {
				if (!res.ok) {
					if (res.status == 404) {
						// throw new Error('No image for this release on Cover Art Archive.');
						return res;
					} else {
						throw new Error(res.statusText);
					}
				}
				return res;
			})
			.then((res) => res)
			.catch(error => { throw new Error(error); });
	} catch (error) {
		return { error: `Failed to fetch image - \`${error}\`` };
	}

	if (coverArt.error) {
		return { error: `Unknown error: \`${coverArt.error}\`` };
	}

	if (coverArt.status == 200) {
		return coverArt.url;
	}

	return { error: 'No image for this release on Cover Art Archive.' };
};

exports.getNowPlaying = async (user, nickname) => {
	let nowPlaying;
	try {
		nowPlaying = await fetch(`https://api.listenbrainz.org/1/user/${nickname}/playing-now`, {
			method: 'GET',
			headers: {
				'Authorization': `Token ${process.env.LISTENBRAINZ_TOKEN}`,
			},
		})
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

	// if (nowPlaying.error) {
	// 	console.log(nowPlaying);
	// 	return interaction.editReply('Unknown listenbrainz API error 🔥');
	// }

	if (!nowPlaying.payload) {
		return { error: 'No data for user.' };
	}

	if (nowPlaying.payload.count == 0) {
		return { error: `${user} (\`${nickname}\`) is not listening to anything right now. 🔇` };
	}

	// console.log(nowPlaying);
	// console.log(nowPlaying.payload.listens);
	// console.log(nowPlaying.payload.listens[0].track_metadata.additional_info);

	return nowPlaying;
};

exports.colors = {
	orange: 'f07543',
	redViolet: 'bf458e',
	violet: '362e6e',
};

exports.msg = {
	missingUsername: (user) => {
		return `Could not find ${user} listenbrainz nickname in a bot database. Use \`listenbrainz nickname set\` command to submit your nickname.`;
	},
};