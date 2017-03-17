/*
* @Last modified in Sublime on Mar 17, 2017 12:07:50 AM
*/
'use strict';

const {config, redisErrorHandler} = require('app');
const Redis = require('ioredis');
const ExpressBrute = require('express-brute');
const BruteRedis = require('express-brute-redis');

const bruteAPIRedis = new Redis({
	host: config.redis.nodisk.host || 'localhost',
	port: config.redis.nodisk.port,
	db: config.redis.nodisk.db.bruteAPI,
	dropBufferSupport: true
});

bruteAPIRedis.on('error', redisErrorHandler.bind(null, 'bruteAPIRedis'));

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
