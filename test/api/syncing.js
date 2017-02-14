/*
* @Last modified in Sublime on Feb 06, 2017 07:43:21 AM
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
					should(res.body.syncSessionID).have.length(36);

					syncSessionID = res.body.syncSessionID;

					done();
				});
		});
	});

	describe('Up', function () {
		it('should fail without syncSessionID', (done) => {
			request
				.post('/api/client/sync/up')
				.expect({
					error: 'missing syncSessionID'
				}, done);
		});		

		it('should fail with invalid syncSessionID', (done) => {
			request
				.post('/api/client/sync/up')
				.send({
					syncSessionID: '1'
				})
				.expect({
					error: 'invalid syncSessionID'
				}, done);
		});

		it.skip('should fail with invalid IP', (done) => {
			request
				.post('/api/client/sync/up')
				.set('X-Forwarded-For', '10.1.2.3')
				.send({ syncSessionID })
				.expect({
					error: 'invalid syncSessionID'
				}, done);
		});

		it('should upload data file', (done) => {
			request
				.post('/api/client/sync/up')
				.send({ syncSessionID })
				.expect('"OK"', done);
		});
	});
});

should;
