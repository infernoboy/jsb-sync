/*
* @Last modified in Sublime on Feb 11, 2017 08:30:40 AM
*/
'use strict';

const {config} = require('app');
const Redis = require('ioredis');

const bruteAPIRedis = new Redis({
	port: config.redis.nodisk.port,
	db: config.redis.nodisk.db.bruteAPI,
	dropBufferSupport: true
});

module.exports = {
	bruteAPIRedis: bruteAPIRedis
};
