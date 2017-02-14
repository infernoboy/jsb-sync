/*
* @Last modified in Sublime on Feb 11, 2017 08:30:50 AM
*/
'use strict';

const {config} = require('app');
const Redis = require('ioredis');
const ExpressBrute = require('express-brute');
const BruteRedis = require('express-brute-redis');

const bruteWebRedis = new Redis({
	port: config.redis.nodisk.port,
	db: config.redis.nodisk.db.bruteWeb,
	dropBufferSupport: true
});

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
