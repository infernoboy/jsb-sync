/*
* @Last modified in Sublime on Mar 08, 2017 12:57:02 PM
*/
'use strict';

const {config, redisErrorHandler} = require('app');
const Redis = require('ioredis');
const ExpressBrute = require('express-brute');
const BruteRedis = require('express-brute-redis');

const bruteWebRedis = new Redis({
	port: config.redis.nodisk.port,
	db: config.redis.nodisk.db.bruteWeb,
	dropBufferSupport: true
});

bruteWebRedis.on('error', redisErrorHandler);

const store = new BruteRedis({
	client: bruteWebRedis
});

module.exports = {
	bruteforce: new ExpressBrute(store, {
		freeRetries: 15,
		minWait: 5000,
		maxWait: 5000,
		lifetime: 10,
		failCallback: (req, res) => {
			res.sendStatus(429);
		}
	})
};
