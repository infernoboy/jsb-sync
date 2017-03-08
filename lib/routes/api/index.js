/*
* @Last modified in Sublime on Mar 08, 2017 12:56:42 PM
*/
'use strict';

const {config, redisErrorHandler} = require('app');
const Redis = require('ioredis');

const bruteAPIRedis = new Redis({
	port: config.redis.nodisk.port,
	db: config.redis.nodisk.db.bruteAPI,
	dropBufferSupport: true
});

bruteAPIRedis.on('error', redisErrorHandler);

module.exports = {
	bruteAPIRedis: bruteAPIRedis
};
