/*
* @Last modified in Sublime on Feb 22, 2017 02:03:58 PM
*/

'use strict';

const path = require('path');
const config = require('configs/config');
const {fs} = require('shared/utilities');
const {fileStore} = require('app');

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
			await fs.outputFileAsync(path.join(this.dir, file), content);
		} catch (err) {
			console.error('Error in FileStorage#setContent:', err);

			return false;
		}

		fileStore.set(this.folder, Date.now());

		return true;
	}

	async getContent(file) {
		try {
			return await fs.readFileAsync(path.join(this.dir, file), 'utf8');
		} catch (err) {
			console.error('Error in FileStorage#getContent:', err);

			return null;
		}
	}
}

exports.FileStorage = FileStorage;
