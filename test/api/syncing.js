/*
* @Last modified in Sublime on Feb 23, 2017 12:25:29 PM
*/

'use strict';

const {app} = require('app');
const {bruteAPIRedis} = require('routes/api/bruteforce');
const should = require('should');
const request = require('supertest')(app.get('supertest'));
const CLIENT = require('../config');

describe('Syncing', function () {
	beforeEach(bruteAPIRedis.flushdb.bind(bruteAPIRedis));
	
	let syncSessionID;

	describe('Login', function () {
		this.timeout(1000);

		it('should successfully login', function (done) {
			this.slow(800);

			request
				.post('/api/client/login')
				.send({
					email: CLIENT.EMAIL,
					password: CLIENT.PASSWORD
				})
				.expect(200)
				.end((err, res) => {
					should(res.body).not.have.property('error');
					should(res.body.result).be.exactly('login successful');
					should(res.body.data.syncSessionID).have.length(36);

					syncSessionID = res.body.data.syncSessionID;

					done();
				});
		});
	});
});

should;
