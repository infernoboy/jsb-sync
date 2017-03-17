/*
* @Last modified in Sublime on Mar 17, 2017 12:08:14 AM
*/
'use strict';

const {config, redisErrorHandler} = require('app');
const Redis = require('ioredis');
const ExpressBrute = require('express-brute');
const BruteRedis = require('express-brute-redis');

const bruteWebRedis = new Redis({
	host: config.redis.nodisk.host || 'localhost',
	port: config.redis.nodisk.port,
	db: config.redis.nodisk.db.bruteWeb,
	dropBufferSupport: true
});

bruteWebRedis.on('error', redisErrorHandler.bind(null, 'bruteWebRedis'));

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
