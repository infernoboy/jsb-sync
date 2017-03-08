/*
* @Last modified in Sublime on Mar 08, 2017 12:56:23 PM
*/
'use strict';

const {config, redisErrorHandler} = require('app');
const Redis = require('ioredis');
const ExpressBrute = require('express-brute');
const BruteRedis = require('express-brute-redis');

const bruteAPIRedis = new Redis({
	port: config.redis.nodisk.port,
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
