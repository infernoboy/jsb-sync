/*
* @Last modified in Sublime on Feb 05, 2017 01:32:32 PM
*/

'use strict';

const {app, newAccounts, accounts, syncSession} = require('../../lib/app');
const {bruteAPIRedis} = require('../../lib/routes/api/bruteforce');
const should = require('should');
const ursa = require('ursa');
const request = require('supertest')(app.get('supertest'));

const keys = ursa.generatePrivateKey();

const CLIENT = {
	INVALID_EMAIL: 'not',
	UNKNOWN_EMAIL: 'notmyemail@domain.com',
	EMAIL: 'myemail@domain.com',
	PASSWORD: 'mypassword',
	VERIFICATION_KEY: '12a331d7-6ad4-4b67-9aa6-cb56283d00a2',
	KEYS: {
		PRIVATE: ursa.createPrivateKey(keys.toPrivatePem('base64'), '', 'base64'),
		PUBLIC: ursa.createPublicKey(keys.toPublicPem('base64'), 'base64')
	}
};

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
					password: 'z'
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
				.expect({
					result: 'created new client'
				}, done);
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
					error: 'invalid verification key for email'
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
});

describe('Existing Client', function () {
	beforeEach(bruteAPIRedis.flushdb.bind(bruteAPIRedis));
	
	let syncSessionID;

	describe('Login', function () {
		this.timeout(1000);

		it('should fail to login to non-existent account', function (done) {
			request
				.post('/api/client/login')
				.send({
					email: CLIENT.UNKNOWN_EMAIL,
					password: 'aaaaa'
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
					password: 'aaaaa'
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
					should(res.body.syncSessionID).have.length(36);

					syncSessionID = res.body.syncSessionID;

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
					should(res.body).not.have.property('error');
					should(res.body.result).be.exactly('login successful');
					should(res.body.syncSessionID).have.length(36);
					res.body.syncSessionID.should.not.be.exactly(syncSessionID);

					syncSessionID = res.body.syncSessionID;

					done();
				});
		});
	});

	describe('Master Data', function () {
		it('should fail without syncSessionID', (done) => {
			request
				.post('/api/client/data/setMaster')
				.expect({
					error: 'missing syncSessionID'
				}, done);
		});		

		it('should fail with invalid syncSessionID', (done) => {
			request
				.post('/api/client/data/setMaster')
				.send({
					syncSessionID: '1'
				})
				.expect({
					error: 'invalid syncSessionID'
				}, done);
		});

		it.skip('should fail with invalid IP', (done) => {
			request
				.post('/api/client/data/setMaster')
				.set('X-Forwarded-For', '10.1.2.3')
				.send({ syncSessionID })
				.expect({
					error: 'invalid syncSessionID'
				}, done);
		});

		it('should set master data file', (done) => {
			request
				.post('/api/client/data/setMaster')
				.send({ syncSessionID })
				.expect('"OK"', done);
		});
	});
});

should;
