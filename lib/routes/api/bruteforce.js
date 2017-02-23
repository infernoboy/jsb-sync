/*
* @Last modified in Sublime on Feb 22, 2017 04:41:18 PM
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
		freeRetries: 100,
		minWait: 5000,
		maxWait: 5000,
		lifetime: 10,
		failCallback: (req, res) => {
			res.sendStatus(429);
		}
	})
};
