/*
* @Last modified in Sublime on Feb 05, 2017 01:24:08 PM
*/
'use strict';

const {app, config} = require('../../app');
const Redis = require('ioredis');

const bruteAPIRedis = new Redis({
	port: app.get('redis-port:nodisk'),
	db: config.redis.nodisk.db.bruteAPI,
	dropBufferSupport: true
});

module.exports = {
	bruteAPIRedis: bruteAPIRedis
};
