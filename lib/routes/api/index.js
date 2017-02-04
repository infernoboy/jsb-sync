/*
* @Last modified in Sublime on Feb 04, 2017 07:17:10 AM
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

	client: require('./client'),

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
