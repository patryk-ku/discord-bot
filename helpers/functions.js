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
