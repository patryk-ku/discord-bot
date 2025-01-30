const querystring = require('node:querystring');
const Ddragon = require('./lol_ddragon');

exports.getRouteByRegion = (region) => {
	const api = '.api.riotgames.com';
	switch (region) {
		case 'eun1':
		case 'euw1':
			return `europe${api}`;
		case 'kr':
			return `asia${api}`;
		case 'na1':
			return `americas${api}`;
	}
};

// example eun1 -> eune
exports.regionCodeToName = (code) => {
	switch (code) {
		case 'eun1':
			return 'eune';
		case 'euw1':
			return 'euw';
		case 'kr':
			return 'kr';
		case 'na1':
			return 'na';
	}
};

exports.getQueueNameById = (id) => {
	// Copied from: https://static.developer.riotgames.com/docs/lol/queues.json
	const queues = [
		{
			queueId: 0,
			map: 'Custom games',
			description: null,
			notes: null,
		},
		{
			queueId: 2,
			map: "Summoner's Rift",
			description: '5v5 Blind Pick games',
			notes: 'Deprecated in patch 7.19 in favor of queueId 430',
		},
		{
			queueId: 4,
			map: "Summoner's Rift",
			description: '5v5 Ranked Solo games',
			notes: 'Deprecated in favor of queueId 420',
		},
		{
			queueId: 6,
			map: "Summoner's Rift",
			description: '5v5 Ranked Premade games',
			notes: 'Game mode deprecated',
		},
		{
			queueId: 7,
			map: "Summoner's Rift",
			description: 'Co-op vs AI games',
			notes: 'Deprecated in favor of queueId 32 and 33',
		},
		{
			queueId: 8,
			map: 'Twisted Treeline',
			description: '3v3 Normal games',
			notes: 'Deprecated in patch 7.19 in favor of queueId 460',
		},
		{
			queueId: 9,
			map: 'Twisted Treeline',
			description: '3v3 Ranked Flex games',
			notes: 'Deprecated in patch 7.19 in favor of queueId 470',
		},
		{
			queueId: 14,
			map: "Summoner's Rift",
			description: '5v5 Draft Pick games',
			notes: 'Deprecated in favor of queueId 400',
		},
		{
			queueId: 16,
			map: 'Crystal Scar',
			description: '5v5 Dominion Blind Pick games',
			notes: 'Game mode deprecated',
		},
		{
			queueId: 17,
			map: 'Crystal Scar',
			description: '5v5 Dominion Draft Pick games',
			notes: 'Game mode deprecated',
		},
		{
			queueId: 25,
			map: 'Crystal Scar',
			description: 'Dominion Co-op vs AI games',
			notes: 'Game mode deprecated',
		},
		{
			queueId: 31,
			map: "Summoner's Rift",
			description: 'Co-op vs AI Intro Bot games',
			notes: 'Deprecated in patch 7.19 in favor of queueId 830',
		},
		{
			queueId: 32,
			map: "Summoner's Rift",
			description: 'Co-op vs AI Beginner Bot games',
			notes: 'Deprecated in patch 7.19 in favor of queueId 840',
		},
		{
			queueId: 33,
			map: "Summoner's Rift",
			description: 'Co-op vs AI Intermediate Bot games',
			notes: 'Deprecated in patch 7.19 in favor of queueId 850',
		},
		{
			queueId: 41,
			map: 'Twisted Treeline',
			description: '3v3 Ranked Team games',
			notes: 'Game mode deprecated',
		},
		{
			queueId: 42,
			map: "Summoner's Rift",
			description: '5v5 Ranked Team games',
			notes: 'Game mode deprecated',
		},
		{
			queueId: 52,
			map: 'Twisted Treeline',
			description: 'Co-op vs AI games',
			notes: 'Deprecated in patch 7.19 in favor of queueId 800',
		},
		{
			queueId: 61,
			map: "Summoner's Rift",
			description: '5v5 Team Builder games',
			notes: 'Game mode deprecated',
		},
		{
			queueId: 65,
			map: 'Howling Abyss',
			description: '5v5 ARAM games',
			notes: 'Deprecated in patch 7.19 in favor of queueId 450',
		},
		{
			queueId: 67,
			map: 'Howling Abyss',
			description: 'ARAM Co-op vs AI games',
			notes: 'Game mode deprecated',
		},
		{
			queueId: 70,
			map: "Summoner's Rift",
			description: 'One for All games',
			notes: 'Deprecated in patch 8.6 in favor of queueId 1020',
		},
		{
			queueId: 72,
			map: 'Howling Abyss',
			description: '1v1 Snowdown Showdown games',
			notes: null,
		},
		{
			queueId: 73,
			map: 'Howling Abyss',
			description: '2v2 Snowdown Showdown games',
			notes: null,
		},
		{
			queueId: 75,
			map: "Summoner's Rift",
			description: '6v6 Hexakill games',
			notes: null,
		},
		{
			queueId: 76,
			map: "Summoner's Rift",
			description: 'Ultra Rapid Fire games',
			notes: null,
		},
		{
			queueId: 78,
			map: 'Howling Abyss',
			description: 'One For All: Mirror Mode games',
			notes: null,
		},
		{
			queueId: 83,
			map: "Summoner's Rift",
			description: 'Co-op vs AI Ultra Rapid Fire games',
			notes: null,
		},
		{
			queueId: 91,
			map: "Summoner's Rift",
			description: 'Doom Bots Rank 1 games',
			notes: 'Deprecated in patch 7.19 in favor of queueId 950',
		},
		{
			queueId: 92,
			map: "Summoner's Rift",
			description: 'Doom Bots Rank 2 games',
			notes: 'Deprecated in patch 7.19 in favor of queueId 950',
		},
		{
			queueId: 93,
			map: "Summoner's Rift",
			description: 'Doom Bots Rank 5 games',
			notes: 'Deprecated in patch 7.19 in favor of queueId 950',
		},
		{
			queueId: 96,
			map: 'Crystal Scar',
			description: 'Ascension games',
			notes: 'Deprecated in patch 7.19 in favor of queueId 910',
		},
		{
			queueId: 98,
			map: 'Twisted Treeline',
			description: '6v6 Hexakill games',
			notes: null,
		},
		{
			queueId: 100,
			map: "Butcher's Bridge",
			description: '5v5 ARAM games',
			notes: null,
		},
		{
			queueId: 300,
			map: 'Howling Abyss',
			description: 'Legend of the Poro King games',
			notes: 'Deprecated in patch 7.19 in favor of queueId 920',
		},
		{
			queueId: 310,
			map: "Summoner's Rift",
			description: 'Nemesis games',
			notes: null,
		},
		{
			queueId: 313,
			map: "Summoner's Rift",
			description: 'Black Market Brawlers games',
			notes: null,
		},
		{
			queueId: 315,
			map: "Summoner's Rift",
			description: 'Nexus Siege games',
			notes: 'Deprecated in patch 7.19 in favor of queueId 940',
		},
		{
			queueId: 317,
			map: 'Crystal Scar',
			description: 'Definitely Not Dominion games',
			notes: null,
		},
		{
			queueId: 318,
			map: "Summoner's Rift",
			description: 'ARURF games',
			notes: 'Deprecated in patch 7.19 in favor of queueId 900',
		},
		{
			queueId: 325,
			map: "Summoner's Rift",
			description: 'All Random games',
			notes: null,
		},
		{
			queueId: 400,
			map: "Summoner's Rift",
			description: '5v5 Draft Pick games',
			notes: null,
		},
		{
			queueId: 410,
			map: "Summoner's Rift",
			description: '5v5 Ranked Dynamic games',
			notes: 'Game mode deprecated in patch 6.22',
		},
		{
			queueId: 420,
			map: "Summoner's Rift",
			description: '5v5 Ranked Solo games',
			notes: null,
		},
		{
			queueId: 430,
			map: "Summoner's Rift",
			description: '5v5 Blind Pick games',
			notes: null,
		},
		{
			queueId: 440,
			map: "Summoner's Rift",
			description: '5v5 Ranked Flex games',
			notes: null,
		},
		{
			queueId: 450,
			map: 'Howling Abyss',
			description: '5v5 ARAM games',
			notes: null,
		},
		{
			queueId: 460,
			map: 'Twisted Treeline',
			description: '3v3 Blind Pick games',
			notes: 'Deprecated in patch 9.23',
		},
		{
			queueId: 470,
			map: 'Twisted Treeline',
			description: '3v3 Ranked Flex games',
			notes: 'Deprecated in patch 9.23',
		},
		{
			queueId: 490,
			map: "Summoner's Rift",
			description: 'Normal (Quickplay)',
			notes: null,
		},
		{
			queueId: 600,
			map: "Summoner's Rift",
			description: 'Blood Hunt Assassin games',
			notes: null,
		},
		{
			queueId: 610,
			map: 'Cosmic Ruins',
			description: 'Dark Star: Singularity games',
			notes: null,
		},
		{
			queueId: 700,
			map: "Summoner's Rift",
			description: "Summoner's Rift Clash games",
			notes: null,
		},
		{
			queueId: 720,
			map: 'Howling Abyss',
			description: 'ARAM Clash games',
			notes: null,
		},
		{
			queueId: 800,
			map: 'Twisted Treeline',
			description: 'Co-op vs. AI Intermediate Bot games',
			notes: 'Deprecated in patch 9.23',
		},
		{
			queueId: 810,
			map: 'Twisted Treeline',
			description: 'Co-op vs. AI Intro Bot games',
			notes: 'Deprecated in patch 9.23',
		},
		{
			queueId: 820,
			map: 'Twisted Treeline',
			description: 'Co-op vs. AI Beginner Bot games',
			notes: null,
		},
		{
			queueId: 830,
			map: "Summoner's Rift",
			description: 'Co-op vs. AI Intro Bot games',
			notes: null,
		},
		{
			queueId: 840,
			map: "Summoner's Rift",
			description: 'Co-op vs. AI Beginner Bot games',
			notes: null,
		},
		{
			queueId: 850,
			map: "Summoner's Rift",
			description: 'Co-op vs. AI Intermediate Bot games',
			notes: null,
		},
		{
			queueId: 900,
			map: "Summoner's Rift",
			description: 'ARURF games',
			notes: null,
		},
		{
			queueId: 910,
			map: 'Crystal Scar',
			description: 'Ascension games',
			notes: null,
		},
		{
			queueId: 920,
			map: 'Howling Abyss',
			description: 'Legend of the Poro King games',
			notes: null,
		},
		{
			queueId: 940,
			map: "Summoner's Rift",
			description: 'Nexus Siege games',
			notes: null,
		},
		{
			queueId: 950,
			map: "Summoner's Rift",
			description: 'Doom Bots Voting games',
			notes: null,
		},
		{
			queueId: 960,
			map: "Summoner's Rift",
			description: 'Doom Bots Standard games',
			notes: null,
		},
		{
			queueId: 980,
			map: 'Valoran City Park',
			description: 'Star Guardian Invasion: Normal games',
			notes: null,
		},
		{
			queueId: 990,
			map: 'Valoran City Park',
			description: 'Star Guardian Invasion: Onslaught games',
			notes: null,
		},
		{
			queueId: 1000,
			map: 'Overcharge',
			description: 'PROJECT: Hunters games',
			notes: null,
		},
		{
			queueId: 1010,
			map: "Summoner's Rift",
			description: 'Snow ARURF games',
			notes: null,
		},
		{
			queueId: 1020,
			map: "Summoner's Rift",
			description: 'One for All games',
			notes: null,
		},
		{
			queueId: 1030,
			map: 'Crash Site',
			description: 'Odyssey Extraction: Intro games',
			notes: null,
		},
		{
			queueId: 1040,
			map: 'Crash Site',
			description: 'Odyssey Extraction: Cadet games',
			notes: null,
		},
		{
			queueId: 1050,
			map: 'Crash Site',
			description: 'Odyssey Extraction: Crewmember games',
			notes: null,
		},
		{
			queueId: 1060,
			map: 'Crash Site',
			description: 'Odyssey Extraction: Captain games',
			notes: null,
		},
		{
			queueId: 1070,
			map: 'Crash Site',
			description: 'Odyssey Extraction: Onslaught games',
			notes: null,
		},
		{
			queueId: 1090,
			map: 'Convergence',
			description: 'Teamfight Tactics games',
			notes: null,
		},
		{
			queueId: 1100,
			map: 'Convergence',
			description: 'Ranked Teamfight Tactics games',
			notes: null,
		},
		{
			queueId: 1110,
			map: 'Convergence',
			description: 'Teamfight Tactics Tutorial games',
			notes: null,
		},
		{
			queueId: 1111,
			map: 'Convergence',
			description: 'Teamfight Tactics test games',
			notes: null,
		},
		{
			queueId: 1200,
			map: 'Nexus Blitz',
			description: 'Nexus Blitz games',
			notes: 'Deprecated in patch 9.2',
		},
		{
			queueId: 1300,
			map: 'Nexus Blitz',
			description: 'Nexus Blitz games',
			notes: null,
		},
		{
			queueId: 1400,
			map: "Summoner's Rift",
			description: 'Ultimate Spellbook games',
			notes: null,
		},
		{
			queueId: 1700,
			map: 'Rings of Wrath',
			description: 'Arena',
			notes: null,
		},
		{
			queueId: 1900,
			map: "Summoner's Rift",
			description: 'Pick URF games',
			notes: null,
		},
		{
			queueId: 2000,
			map: "Summoner's Rift",
			description: 'Tutorial 1',
			notes: null,
		},
		{
			queueId: 2010,
			map: "Summoner's Rift",
			description: 'Tutorial 2',
			notes: null,
		},
		{
			queueId: 2020,
			map: "Summoner's Rift",
			description: 'Tutorial 3',
			notes: null,
		},
	];

	let name = queues.filter((queue) => queue.queueId === id)[0].description;

	// Delete '5v5' from name
	if (name.slice(0, 4) === '5v5 ') {
		name = name.slice(4);
	}

	// Delete 'games'from name
	if (name.slice(-6) === ' games') {
		name = name.slice(0, -6);
	}

	return name;
};

exports.ddragonVer = '14.8.1';

exports.getChampionAvatar = (name) => {
	return `https://ddragon.leagueoflegends.com/cdn/${this.ddragonVer}/img/champion/${name}.png`;
};

exports.getProfileIcon = (id) => {
	return `https://ddragon.leagueoflegends.com/cdn/${this.ddragonVer}/img/profileicon/${id}.png`;
};

exports.getChampionNameById = (id) => {
	return Ddragon.getChampionNameById(id);
};

exports.getSummonersNameById = (id) => {
	return Ddragon.getSummonersNameById(id);
};

exports.getUserPuuid = async (nickname, region) => {
	const REGION = this.getRouteByRegion(region);

	let [gameName, tagLine] = nickname.split('#');
	gameName = querystring.escape(gameName);
	tagLine = querystring.escape(tagLine);

	let userInfo;
	try {
		userInfo = await fetch(
			`https://${REGION}/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}?api_key=${process.env.RIOTGAMES_TOKEN}`
		)
			.then((res) => {
				if (!res.ok) {
					throw new Error(res.statusText);
				}
				return res;
			})
			.then((res) => res.json())
			.catch((error) => {
				throw new Error(error);
			});
	} catch (error) {
		return { error: error.message };
	}

	if (userInfo.error) {
		return { error: 'ERROR: WIP' };
	}

	if (!userInfo.puuid) {
		return { error: 'ERROR: WIP' };
	}

	return userInfo.puuid;
};

exports.getMatchHistory = async (puuid, region, count) => {
	const REGION = this.getRouteByRegion(region);

	let matchHistory;
	try {
		matchHistory = await fetch(
			`https://${REGION}/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}&api_key=${process.env.RIOTGAMES_TOKEN}`
		)
			.then((res) => {
				if (!res.ok) {
					throw new Error(res.statusText);
				}
				return res;
			})
			.then((res) => res.json())
			.catch((error) => {
				throw new Error(error);
			});
	} catch (error) {
		return { error: error.message };
	}

	if (matchHistory.error) {
		return { error: 'ERROR: WIP' };
	}

	if (matchHistory.length === 0 || matchHistory.length !== count) {
		return { error: 'ERROR: WIP' };
	}

	return matchHistory;
};

exports.getMatch = async (id, region) => {
	const REGION = this.getRouteByRegion(region);

	let match;
	try {
		match = await fetch(
			`https://${REGION}/lol/match/v5/matches/${id}?api_key=${process.env.RIOTGAMES_TOKEN}`
		)
			.then((res) => {
				if (!res.ok) {
					throw new Error(res.statusText);
				}
				return res;
			})
			.then((res) => res.json())
			.catch((error) => {
				throw new Error(error);
			});
	} catch (error) {
		return { error: error.message };
	}

	if (match.error) {
		return { error: 'ERROR: WIP' };
	}

	if (!match.info) {
		return { error: 'ERROR: WIP' };
	}

	return match;
};

exports.getNowPlayingMatch = async (puuid, region) => {
	const _REGION = this.getRouteByRegion(region);

	let liveMatch;
	try {
		liveMatch = await fetch(
			`https://${region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}?api_key=${process.env.RIOTGAMES_TOKEN}`
		)
			.then((res) => {
				if (!res.ok) {
					if (res.status === 404) {
						throw new Error('The user is not playing now.');
					} else {
						throw new Error(res.statusText);
					}
				}
				return res;
			})
			.then((res) => res.json())
			.catch((error) => {
				throw new Error(error);
			});
	} catch (error) {
		return { error: error.message };
	}

	if (liveMatch.error) {
		return { error: 'ERROR: WIP' };
	}

	if (!liveMatch.gameId) {
		return { error: 'ERROR: WIP' };
	}

	return liveMatch;
};
