/*
* @Last modified in Sublime on Feb 06, 2017 07:35:24 AM
*/

'use strict';

const configs = require('configs');

const config = configs[process.env.NODE_ENV];

if (!config) {
	console.error(`No config for environment: ${process.env.NODE_ENV}`);
	process.exit(1);
}

module.exports = config;
