/*
* @Last modified in Sublime on Feb 05, 2017 01:36:12 PM
*/

'use strict';

const {app} = require('../../lib/app');
const {bruteAPIRedis} = require('../../lib/routes/api');
const should = require('should');
const request = require('supertest')(app.get('supertest'));

describe.skip('Bruteforce Protection', () => {
	before(bruteAPIRedis.flushdb.bind(bruteAPIRedis));
	after(bruteAPIRedis.flushdb.bind(bruteAPIRedis));

	for (let i = 1; i < 7; i++)
		it(`request ${i} returns 200`, (done) => {
			request
				.get('/api/')
				.expect(200, done);
		});

	it('request 7 returns 429 (too many requests within 5s)', (done) => {
		request
			.get('/api/')
			.expect(429, done);
	});
		
	it('request 8 returns 200 (timeout reset)', function (done) {
		this.slow(5100);

		setTimeout(() => {
			request
				.get('/api/')
				.expect(200, done);
		}, 5000);
	}).timeout(6000);
});

should;
