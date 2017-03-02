/*
* @Last modified in Sublime on Feb 27, 2017 11:43:54 AM
*/

'use strict';

const path = require('path');
const config = require('configs/config');
const {fs} = require('shared/utilities');

class FileStorage {
	constructor(folder) {
		this.folder = FileStorage.clean(folder);
		this.dir = path.join(config.dataDir, this.folder);
	}

	static clean(string) {
		return string.replace(/[\/:]|(\.\.)/g, '-');
	}

	async remove(file) {
		return await fs.removeAsync(path.join(this.dir, file));
	}

	async empty(folder = '.') {
		return await fs.emptyDirAsync(path.join(this.dir, folder));
	}

	async list(folder = '.') {
		folder = path.join(this.dir, folder);

		try {
			return await fs.readdirAsync(folder);
		} catch (err) {
			return [];
		}
	}

	async setContent(file, content = '') {
		try {
			await fs.outputFileAsync(path.join(this.dir, file), JSON.stringify(content));
		} catch (err) {
			console.error('Error in FileStorage#setContent:', err);

			return false;
		}

		return true;
	}

	async getContent(file) {
		try {
			return JSON.parse(await fs.readFileAsync(path.join(this.dir, file), 'utf8'));
		} catch (err) {
			console.error('Error in FileStorage#getContent:', err);

			return null;
		}
	}
}

exports.FileStorage = FileStorage;
