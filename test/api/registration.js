/*
* @Last modified in Sublime on Mar 01, 2017 08:04:26 PM
*/

'use strict';

const {app, newAccounts, accounts, syncSession} = require('app');
const {bruteAPIRedis} = require('routes/api/bruteforce');
const should = require('should');
const request = require('supertest')(app.get('supertest'));
const CLIENT = require('../config');

describe('New Client', function () {
	beforeEach(bruteAPIRedis.flushdb.bind(bruteAPIRedis));

	before((done) => {
		newAccounts.flushdb(() => accounts.flushdb(() => syncSession.flushdb(done)));
	});

	describe('Register', function () {
		it('should fail without an email', (done) => {
			request
				.post('/api/client/register')
				.expect({
					error: 'missing email'
				}, done);
		});

		it('should fail with an invalid email', (done) => {
			request
				.post('/api/client/register')
				.send({
					email: CLIENT.INVALID_EMAIL,
					password: CLIENT.PASSWORD
				})
				.expect({
					error: 'invalid email'
				}, done);
		});

		it('should fail without a password', (done) => {
			request
				.post('/api/client/register')
				.send({
					email: CLIENT.INVALID_EMAIL,
					password: ''
				})
				.expect({
					error: 'missing password'
				}, done);
		});

		it('should fail with an invalid password', (done) => {
			request
				.post('/api/client/register')
				.send({
					email: CLIENT.EMAIL,
					password: CLIENT.INVALID_PASSWORD
				})
				.expect({
					error: 'invalid password'
				}, done);
		});

		it('should successfully create the new client', function (done) {
			this.slow(800);

			request
				.post('/api/client/register')
				.send({
					email: CLIENT.EMAIL,
					password: CLIENT.PASSWORD
				})
				.expect(200)
				.end((err, res) =>{
					if (err)
						return done(err);

					should(res.body).not.have.property('error');
					should(res.body.result).be.exactly('created new client');
					should(res.body.clientID).have.length(36);

					done();
				});
		}).timeout(1000);
	});

	describe('Verify', function () {
		it('should fail to verify an unknown client', function (done) {
			request
				.post('/api/client/verify')
				.send({
					email: CLIENT.UNKNOWN_EMAIL,
					verificationKey: 'NONE'
				})
				.expect({
					error: 'client not found'
				}, done);
		});

		it('should fail to verify the new client', function (done) {
			request
				.post('/api/client/verify')
				.send({
					email: CLIENT.EMAIL,
					verificationKey: 'NONE'
				})
				.expect({
					error: 'invalid verification key'
				}, done);
		});

		it('should fail to login without verification', function (done) {
			request
				.post('/api/client/login')
				.send({
					email: CLIENT.EMAIL,
					password: CLIENT.PASSWORD
				})
				.expect({
					error: 'client not verified'
				}, done);
		});

		it('should successfully verify and promote the new client', function (done) {
			request
				.post('/api/client/verify')
				.send({
					email: CLIENT.EMAIL,
					verificationKey: CLIENT.VERIFICATION_KEY
				})
				.expect({
					result: 'verified new client'
				}, done);
		});

		it('should inform client is already verified', function (done) {
			request
				.post('/api/client/verify')
				.send({
					email: CLIENT.EMAIL,
					verificationKey: CLIENT.VERIFICATION_KEY
				})
				.expect({
					error: 'client already verified'
				}, done);
		});
	});

	describe('Register Again With Same Email', function () {
		it('should fail to create the same client', function (done) {
			request
				.post('/api/client/register')
				.send({
					email: CLIENT.EMAIL,
					password: CLIENT.PASSWORD
				})
				.expect({
					error: 'client exists'
				}, done);
		});
	});
	
	let syncSessionID;

	describe('Login', function () {
		this.timeout(1000);

		it('should fail to login to non-existent account', function (done) {
			request
				.post('/api/client/login')
				.send({
					email: CLIENT.UNKNOWN_EMAIL,
					password: CLIENT.ACCOUNT_INVALID_PASSWORD
				})
				.expect({
					error: 'client not found'
				}, done);
		});

		it('should fail login with incorrect password', function (done) {
			this.slow(800);

			request
				.post('/api/client/login')
				.send({
					email: CLIENT.EMAIL,
					password: CLIENT.ACCOUNT_INVALID_PASSWORD
				})
				.expect({
					error: 'mismatch'
				}, done);
		});

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

		it('should update the session expire time', (done) => {
			request
				.post('/api/client/ping')
				.send({ syncSessionID })
				.expect({
					result: 'ok'
				}, done);
		});

		it('should login again and change syncSessionID', function (done) {
			this.slow(800);

			request
				.post('/api/client/login')
				.send({
					email: CLIENT.EMAIL,
					password: CLIENT.PASSWORD
				})
				.expect(200)
				.end((err, res) => {
					if (err)
						return done(err);

					should(res.body).not.have.property('error');
					should(res.body.result).be.exactly('login successful');
					should(res.body.data.syncSessionID).have.length(36);
					res.body.data.syncSessionID.should.not.be.exactly(syncSessionID);

					syncSessionID = res.body.data.syncSessionID;

					done();
				});
		});

		it('should fail to logout with mismatching email and syncSessionID', function (done) {
			this.slow(800);

			request
				.post('/api/client/logout')
				.send({
					syncSessionID,
					email: CLIENT.INVALID_EMAIL					
				})
				.expect({
					error: 'session not found'
				}, done);
		});

		it('should successfully logout', function (done) {
			this.slow(800);

			request
				.post('/api/client/logout')
				.send({
					syncSessionID,
					email: CLIENT.EMAIL
				})
				.expect({
					result: 'logout successful'
				}, (err) => {
					syncSessionID = null;

					done(err);
				});
		});
	});
});

should;
