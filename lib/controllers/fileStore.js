/*
* @Last modified in Sublime on Feb 06, 2017 07:34:12 AM
*/

'use strict';

const fs = require('fs-extra');
const config = require('configs/config');
const path = require('path');

class FileStore {
	constructor(root, dbName) {
		this.dir = path.join(config.dataDir, root);
		this.dbName = dbName;

		fs.ensureDirSync(this.dir);
	}
}

exports.FileStore = FileStore;
