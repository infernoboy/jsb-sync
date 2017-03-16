/*
* @Last modified in Sublime on Mar 14, 2017 11:12:06 PM
*/
'use strict';

const {config, redisErrorHandler} = require('app');
const Redis = require('ioredis');

const bruteAPIRedis = new Redis({
	host: config.redis.nodisk.host || 'localhost',
	port: config.redis.disk.port,
	db: config.redis.nodisk.db.bruteAPI,
	dropBufferSupport: true
});

bruteAPIRedis.on('error', redisErrorHandler);

module.exports = {
	bruteAPIRedis: bruteAPIRedis
};
