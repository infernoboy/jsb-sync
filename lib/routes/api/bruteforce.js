/*
* @Last modified in Sublime on Feb 05, 2017 01:32:36 PM
*/
'use strict';

const {app, config} = require('../../app');
const Redis = require('ioredis');
const ExpressBrute = require('express-brute');
const BruteRedis = require('express-brute-redis');

const bruteAPIRedis = new Redis({
	port: app.get('redis-port:nodisk'),
	db: config.redis.nodisk.db.bruteAPI,
	dropBufferSupport: true
});

const store = new BruteRedis({
	client: bruteAPIRedis
});

module.exports = {
	bruteAPIRedis: bruteAPIRedis,
	bruteforce: new ExpressBrute(store, {
		freeRetries: 5,
		minWait: 5000,
		maxWait: 5000,
		lifetime: 10,
		failCallback: (req, res) => {
			res.sendStatus(429);
		}
	})
};
