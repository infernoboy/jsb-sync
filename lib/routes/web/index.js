/*
* @Last modified in Sublime on Feb 02, 2017 07:19:18 AM
*/

const redis_port = require('../../app');
const redis = require('redis');
const ExpressBrute = require('express-brute');
const BruteRedis = require('express-brute-redis');

const bruteClient = redis.createClient({
	port: redis_port
});

bruteClient.select(5);

const store = new BruteRedis({
	client: bruteClient
});

module.exports = {
	bruteforce: new ExpressBrute(store, {
		freeRetries: 11,
		minWait: 5000,
		maxWait: 5000,
		lifetime: 10,
		failCallback: (req, res) => {
			res.sendStatus(429);
		}
	})
};
