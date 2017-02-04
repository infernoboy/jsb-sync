/*
* @Last modified in Sublime on Feb 04, 2017 03:20:02 PM
*/

'use strict';

const {app, newAccounts, accounts} = require('../../lib/app');
const {bruteAPIRedis} = require('../../lib/routes/api');
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
		newAccounts.flushdb(() => accounts.flushdb(done));
	});

	describe('Register', function () {
		it('should reject requests without an email', (done) => {
			request
				.post('/api/client/register')
				.expect({
					error: 'missing email'
				}, done);
		});

		it('should reject requests with an invalid email', (done) => {
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

		it('should reject requests without a password', (done) => {
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

		it('should reject requests with an invalid password', (done) => {
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
			this.slow(7700);

			request
				.post('/api/client/register')
				.send({
					email: CLIENT.EMAIL,
					password: CLIENT.PASSWORD
				})
				.expect({
					result: 'created new client'
				}, done);
		}).timeout(8000);
	});

	describe('Verify', function () {
		this.timeout(8000);

		it('should fail to verify the unknown client', function (done) {
			this.slow(7700);

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
			this.slow(7700);

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

		it('should successfully verify and promote the new client', function (done) {
			this.slow(7700);

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
			this.slow(7700);

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
		it('should fail to create the new client', function (done) {
			this.slow(1700);

			request
				.post('/api/client/register')
				.send({
					email: CLIENT.EMAIL,
					password: CLIENT.PASSWORD
				})
				.expect({
					error: 'client exists'
				}, done);
		}).timeout(2000);
	});

	describe('Login', function () {
		this.timeout(8000);

		it('should successfully login', function (done) {
			this.slow(7700);

			request
				.post('/api/client/login')
				.send({
					email: CLIENT.EMAIL,
					password: CLIENT.PASSWORD
				})
				.expect(200)
				.then((res) => {
					should(res.body.result).be.exactly('login successful');
					should(res.body.syncSessionID).have.length(36);

					done();
				});
		});
	});
});

should;
