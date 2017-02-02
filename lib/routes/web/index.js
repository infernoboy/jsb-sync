/*
* @Last modified in Sublime on Feb 02, 2017 04:06:03 AM
*/

const redis = require('redis');
const ExpressBrute = require('express-brute');
const BruteRedis = require('express-brute-redis');

const bruteClient = redis.createClient();

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
