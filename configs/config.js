/*
* @Last modified in Sublime on Feb 05, 2017 08:57:01 AM
*/

'use strict';

const configs = require('./');

const config = configs[process.env.NODE_ENV];

if (!config) {
	console.error(`No config for environment: ${process.env.NODE_ENV}`);
	process.exit(1);
}

module.exports = config;
