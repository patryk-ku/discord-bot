const fs = require('fs').promises;

exports.downloadFile = async (url, path, retry = false) => {
	let response;
	try {
		response = await fetch(url)
			.then((res) => {
				if (!res.ok) {
					throw new Error(res.statusText);
				}
				return res;
			})
			.then((res) => res.arrayBuffer())
			.catch((error) => {
				throw new Error(error);
			});
	} catch (error) {
		// return { error: `Failed to fetch image from url: \`${url}\` because: \`${error}\`` };
		console.log(`Failed to download: ${url}`);

		// todo: do it better
		if (!retry) {
			console.log(`Retrying to download: ${url}`);
			return this.downloadFile(url, path, true);
		}

		// return Promise.reject(new Error(`Failed to fetch image from url: \`${url}\` because: \`${error}\``));
		return Promise.reject(new Error(`Failed to download file - ${error}`));
	}

	const data = Buffer.from(response);
	const file = fs.writeFile(path, data);

	return file;
};

exports.deleteFile = async (path) => {
	if (typeof path !== 'string') {
		console.log('Error while deleting file: given path is not a string.');
		return;
	}

	if (path.length == 0) {
		console.log('Error while deleting file: path cannot be empty.');
		return;
	}

	try {
		await fs.access(path, fs.constants.F_OK);
	} catch (error) {
		console.log(`File don't exists: ${path}`);
		return;
	}

	try {
		await fs.unlink(path);
		console.log(`Deleted file: ${path}`);
	} catch (error) {
		console.error(`Error while deleting file: ${path}. Error code: ${error}`);
	}
};

exports.deleteMultipleFiles = (paths) => {
	for (const path of paths) {
		this.deleteFile(path);
	}
};

exports.msToHoursMinutesSeconds = (ms) => {
	const hours = Math.floor((ms % 86400000) / 3600000).toString();
	const minutes = Math.floor((ms % 3600000) / 60000).toString();
	const seconds = Math.floor((ms % 60000) / 1000).toString();
	return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
};

exports.secondsToHoursMinutes = (s) => {
	const minutes = Math.floor(s / 60).toString();
	const seconds = (s % 60).toString();
	return `${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
};

/**
 * Splits a string into an array of substrings with a maximum length,
 * ensuring that words are not broken across substrings and handling
 * markdown bullet points correctly.

 *
 * @param {string} text - The string to split.
 * @param {number} maxLength - The maximum length of each substring.
 * @returns {string[]} An array of substrings.
 */
exports.splitTextWithWordWrap = (text, maxLength) => {
	if (text.length <= maxLength) {
		return [text];
	}

	const splitText = [];
	let currentIndex = 0;

	while (currentIndex < text.length) {
		let cutPoint = currentIndex + maxLength;

		// If the cut point is within a word, move it back to the last space
		if (cutPoint < text.length && text[cutPoint] !== ' ') {
			cutPoint = text.lastIndexOf(' ', cutPoint);
		}

		// Handle cut points at spaces after markdown bullet points
		if (cutPoint > 1 && text[cutPoint] === ' ' && text[cutPoint - 1] === '*') {
			// Move cutPoint before the space
			cutPoint--;
		}

		// If no space was found before the maxLength, cut the word
		if (cutPoint === -1) {
			cutPoint = currentIndex + maxLength;
		}

		splitText.push(text.substring(currentIndex, cutPoint).trim());
		currentIndex = cutPoint;
	}

	return splitText;
};
