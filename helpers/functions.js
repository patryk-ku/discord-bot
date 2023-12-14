const fs = require('fs').promises;

exports.downloadFile = async (url, path, retry = false) => {
	let response;
	try {
		response = await fetch(url)
			.then(res => {
				if (!res.ok) {
					throw new Error(res.statusText);
				}
				return res;
			})
			.then((res) => res.arrayBuffer())
			.catch(error => { throw new Error(error); });
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
	try {
		await fs.unlink(path);
		console.log(`Deleted file: ${path}.`);
	} catch (err) {
		console.error(err);
	}
};