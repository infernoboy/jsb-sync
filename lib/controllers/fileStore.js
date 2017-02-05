/*
* @Last modified in Sublime on Feb 05, 2017 12:38:53 PM
*/

'use strict';

const fs = require('fs-extra');
const config = require('../../configs/config');

class FileStore {
	constructor() {
		this.dir = config.dataDir;

		fs.ensureDirSync(this.dir);
	}
}

exports.FileStore = FileStore;
