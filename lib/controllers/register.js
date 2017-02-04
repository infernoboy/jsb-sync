/*
* @Last modified in Sublime on Feb 04, 2017 03:16:45 PM
*/

'use strict';

const uuid = require('node-uuid');
const cluster = require('cluster');
const Redis = require('ioredis');
const scrypt = require('scryptsy');
const {accounts, newAccounts, config, app} = require('../app');
const {RSA} = require('../shared/utilities');

const Register = {
	getEmailHash(email) {
		return scrypt(email.toLowerCase(), config.emailSalt, Math.pow(2, 12), 8, 1, 40).toString('hex');
	},

	getPasswordHash(salt, password) {
		return scrypt(password, salt, Math.pow(2, 16), 8, 1, 40).toString('hex');
	},

	async clientWithEmailHashExist(emailHash) {
		return await newAccounts.hexists('emailHash', emailHash) || await accounts.hexists('emailHash', emailHash);
	},

	async getClientByField(field, key, store = accounts) {
		const clientID = await store.hget(field, key);

		if (clientID)
			return Register.getClientByID(clientID, store);
	},

	async getClientByID(clientID, store = accounts) {
		if (!(await store.exists(`client:${clientID}`)))
			return null;

		return await store.hgetall(`client:${clientID}`);
	},

	async promoteNewClient(client) {			
		delete client.verificationKey;

		const results = await accounts.pipeline()
			.hmset('emailHash', client.emailHash, client.id)
			.hmset(`client:${client.id}`, client)
			.exec();

		results.forEach((result) => {
			if (result[0]) {
				console.error('Error in promoteNewClient:', result[0]);

				throw new Error('server error');
			}
		});

		return true;
	},

	async verifyNewClient(email, verificationKey) {
		const emailHash = Register.getEmailHash(email);
		const client = await Register.getClientByField('emailHash', emailHash);

		if (client)
			throw new Error('client already verified');

		const newClient = await Register.getClientByField('emailHash', emailHash, newAccounts);

		if (!newClient)
			throw new Error('client not found');

		if (newClient.verificationKey !== verificationKey && Register.TEST_VERIFICATION_KEY !== verificationKey)
			throw new Error('invalid verification key for email');

		Register.promoteNewClient(newClient);

		return 'verified new client';
	},

	async createNewClient(email, password) {
		if (typeof email !== 'string' || email.length < 5)
			throw new Error('invalid email');

		if (typeof password !== 'string' || password.length < 4)
			throw new Error('invalid password');

		const emailHash = Register.getEmailHash(email);

		if (await Register.clientWithEmailHashExist(emailHash))
			throw new Error('client exists');

		const id = uuid.v4();
		const passwordSalt = uuid.v4();
		const passwordHash = Register.getPasswordHash(passwordSalt, password);
		
		let client = {
			id,
			emailHash,
			passwordSalt,
			passwordHash,
			verificationKey: uuid.v4()
		};

		const results = await newAccounts.pipeline()
			.hmset('emailHash', emailHash, id)
			.hmset(`client:${id}`, client)
			.setex(`client:expire:${id}`, 60 * 60 * 24, id)
			.exec();

		results.forEach((result) => {
			if (result[0]) {
				console.error('Error in createNewClient:', result[0]);

				throw new Error('server error');
			}
		});

		return client;
	},

	async destroyNewClient(clientID) {
		const client = await Register.getClientByID(clientID, newAccounts);

		if (!client)
			return null;

		await newAccounts.pipeline()
			.hdel('emailHash', client.emailHash)
			.del(`client:${clientID}`)
			.exec();

		return true;
	},

	async login(email, password) {
		const emailHash = Register.getEmailHash(email);
		const client = await Register.getClientByField('emailHash', emailHash);

		if (!client) {
			if (await Register.getClientByField('emailHash', emailHash, newAccounts))
				throw new Error('client not verified');

			throw new Error('client not found');
		}

		if (client.passwordHash !== Register.getPasswordHash(client.passwordSalt, password))
			throw new Error('invalid password');

		return uuid.v4();
	}
};

Register.TEST_VERIFICATION_KEY = '12a331d7-6ad4-4b67-9aa6-cb56283d00a2';

if (cluster.isMaster) {
	const clientExpireEvent = `__keyevent@${config.redis.nodisk.db.newAccounts}__:expired`;

	const newAccountsMonitor = new Redis({
		port: app.get('redis-port:nodisk'),
		db: config.redis.nodisk.db.newAccounts,
		dropBufferSupport: true
	});

	newAccountsMonitor.subscribe(clientExpireEvent, (err) => {
		if (err)
			throw new Error('failed to subscribe to expired event for new accounts');
	});

	newAccountsMonitor.on('message', (channel, message) => {
		if (channel === clientExpireEvent)
			Register.destroyNewClient(message.split(':')[2]);
	});
}

module.exports = Register;
