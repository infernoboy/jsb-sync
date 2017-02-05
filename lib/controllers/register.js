/*
* @Last modified in Sublime on Feb 05, 2017 12:30:02 PM
*/

'use strict';

const uuid = require('node-uuid');
const cluster = require('cluster');
const Redis = require('ioredis');
const extend = require('object-extend');
const {accounts, newAccounts, config, app} = require('../app');
const {Hash} = require('../shared/utilities');

const Register = {
	async getEmailHash(email) {
		return await Hash.generateWithSalt(email, config.emailSalt, 5);
	},

	async getPasswordHash(password) {
		return await Hash.generate(password, 25);
	},

	async clientWithEmailHashExists(emailHash) {
		return await newAccounts.hexists('emailHash', emailHash) || await accounts.hexists('emailHash', emailHash);
	},

	async getClientByField(field, key, store = accounts) {
		const clientID = await store.hget(field, key);

		if (clientID)
			return await Register.getClientByID(clientID, store);
	},

	async getClientByEmailHash(emailHash, store = accounts) {
		return await Register.getClientByField('emailHash', emailHash, store);
	},

	async getClientBySyncSessionID(syncSessionID, store = accounts) {
		return await Register.getClientByField('syncSessionID', syncSessionID, store);
	},

	async getClientByID(clientID, store = accounts) {
		if (!(await store.exists(`client:${clientID}`)))
			return null;

		return await store.hgetall(`client:${clientID}`);
	},

	async updateClient(client, newProps = {}) {
		const updatedClient = extend(extend({}, client), newProps);

		updatedClient.id = client.id;

		try {
			const pipeline = await accounts.pipeline()
				.hdel('emailHash', client.emailHash)
				.hset('emailHash', updatedClient.emailHash, client.id)
				.hdel('syncSessionID', client.syncSessionID);

			if (updatedClient.syncSessionID && updatedClient.syncSessionID.length)
				pipeline.hset('syncSessionID', updatedClient.syncSessionID, client.id);

			delete updatedClient.syncSessionID;

			pipeline.hmset(`client:${client.id}`, updatedClient).exec();
		} catch (err) {
			console.error('Error in Register.updateClient:', err);

			throw new Error('server error');
		}
	},

	async promoteNewClient(client) {			
		delete client.verificationKey;

		try {
			await Register.updateClient(client);
			await Register.destroyNewClient(client.id);
		} catch (err) {
			console.error('Error in Register.promoteNewClient:', err);

			throw new Error('server error');
		}

		return true;
	},

	async verifyNewClient(email, verificationKey) {
		const emailHash = await Register.getEmailHash(email);
		const client = await Register.getClientByEmailHash(emailHash);

		if (client)
			throw new Error('client already verified');

		const newClient = await Register.getClientByEmailHash(emailHash, newAccounts);

		if (!newClient)
			throw new Error('client not found');

		if (newClient.verificationKey !== verificationKey && Register.TEST_VERIFICATION_KEY !== verificationKey)
			throw new Error('invalid verification key for email');

		await Register.promoteNewClient(newClient);

		return 'verified new client';
	},

	async createNewClient(email, password) {
		if (typeof email !== 'string' || email.length < 5)
			throw new Error('invalid email');

		if (typeof password !== 'string' || password.length < 4)
			throw new Error('invalid password');

		const emailHash = await Register.getEmailHash(email);

		if (await Register.clientWithEmailHashExists(emailHash))
			throw new Error('client exists');

		const id = uuid.v4();
		const passwordHash = await Register.getPasswordHash(password);
		
		let client = {
			id,
			emailHash,
			passwordHash,
			verificationKey: uuid.v4()
		};

		try {
			await newAccounts.pipeline()
				.hset('emailHash', emailHash, id)
				.hmset(`client:${id}`, client)
				.setex(`client:expire:${id}`, 60 * 60 * 24, 1)
				.exec();
		} catch (err) {
			console.error('Error in Register.createNewClient:', err);
			throw new Error('server error');
		}

		return client;
	},

	async destroyNewClient(clientID) {
		const client = await Register.getClientByID(clientID, newAccounts);

		if (!client)
			return null;

		try {
			await newAccounts.pipeline()
				.hdel('emailHash', client.emailHash)
				.del(`client:${clientID}`)
				.exec();
		} catch (err) {
			console.error('Error in Register.destroyNewClient:', err);
			throw new Error('server error');
		}

		return true;
	},

	async login(email, password, req) {
		const emailHash = await Register.getEmailHash(email);
		const client = await Register.getClientByEmailHash(emailHash);

		if (!client) {
			if (await Register.getClientByEmailHash(emailHash, newAccounts))
				throw new Error('client not verified');

			throw new Error('client not found');
		}

		await Hash.verify(client.passwordHash, password);

		return await createSyncSession(client, req);
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

exports.updateClient = Register.updateClient;
exports.getClientByID = Register.getClientByID;
exports.getClientBySyncSessionID = Register.getClientBySyncSessionID;
exports.createNewClient = Register.createNewClient;
exports.verifyNewClient = Register.verifyNewClient;
exports.login = Register.login;

const {createSyncSession} = require('./syncSession');
