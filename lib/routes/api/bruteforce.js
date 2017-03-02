/*
* @Last modified in Sublime on Feb 23, 2017 06:33:16 PM
*/
'use strict';

const {config} = require('app');
const Redis = require('ioredis');
const ExpressBrute = require('express-brute');
const BruteRedis = require('express-brute-redis');

const bruteAPIRedis = new Redis({
	port: config.redis.nodisk.port,
	db: config.redis.nodisk.db.bruteAPI,
	dropBufferSupport: true
});

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
