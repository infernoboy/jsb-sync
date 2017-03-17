/*
* @Last modified in Sublime on Mar 17, 2017 12:08:03 AM
*/
'use strict';

const {config, redisErrorHandler} = require('app');
const Redis = require('ioredis');

const bruteAPIRedis = new Redis({
	host: config.redis.nodisk.host || 'localhost',
	port: config.redis.nodisk.port,
	db: config.redis.nodisk.db.bruteAPI,
	dropBufferSupport: true
});

bruteAPIRedis.on('error', redisErrorHandler.bind(null, 'bruteAPIRedis'));

module.exports = {
	bruteAPIRedis: bruteAPIRedis
};
