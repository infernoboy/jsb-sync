/*
* @Last modified in Sublime on Mar 14, 2017 11:12:07 PM
*/
'use strict';

const {config, redisErrorHandler} = require('app');
const Redis = require('ioredis');
const ExpressBrute = require('express-brute');
const BruteRedis = require('express-brute-redis');

const bruteAPIRedis = new Redis({
	host: config.redis.nodisk.host || 'localhost',
	port: config.redis.disk.port,
	db: config.redis.nodisk.db.bruteAPI,
	dropBufferSupport: true
});

bruteAPIRedis.on('error', redisErrorHandler);

const store = new BruteRedis({
	client: bruteAPIRedis
});

module.exports = {
	bruteAPIRedis: bruteAPIRedis,
	bruteforce: new ExpressBrute(store, {
		freeRetries: 20,
		minWait: 5000,
		maxWait: 5000,
		lifetime: 5,
		refreshTimeoutOnRequest: true,
		failCallback: (req, res) => {
			res.sendStatus(429);
		}
	})
};
