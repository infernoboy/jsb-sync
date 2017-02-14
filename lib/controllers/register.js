/*
* @Last modified in Sublime on Feb 13, 2017 04:39:43 PM
*/

'use strict';

const uuidv4 = require('uuid/v4');
const cluster = require('cluster');
const Redis = require('ioredis');
const extend = require('object-extend');
const {accounts, newAccounts, config} = require('app');
const {Hash} = require('shared/utilities');

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

		if (newClient.verificationKey !== verificationKey)
			throw new Error('invalid verification key for email');

		await Register.promoteNewClient(newClient);

		return 'verified new client';
	},

	async createNewClient(email, password) {
		if (typeof email !== 'string' || email.length < 5 || !email.includes('@'))
			throw new Error('invalid email');

		if (typeof password !== 'string' || password.length < 4)
			throw new Error('invalid password');

		const emailHash = await Register.getEmailHash(email);

		if (await Register.clientWithEmailHashExists(emailHash))
			throw new Error('client exists');

		console.log(`${email}'s verificationKey = ${config.testRegistrationVerificationKey}`);
		
		let client = {
			emailHash,
			passwordHash: await Register.getPasswordHash(password),
			id: uuidv4(),
			verificationKey: config.testRegistrationVerificationKey // uuidv4()
		};

		try {
			await newAccounts.pipeline()
				.hset('emailHash', emailHash, client.id)
				.hmset(`client:${client.id}`, client)
				.setex(`client:expire:${client.id}`, 60 * 60 * 24, 1)
				.exec();
		} catch (err) {
			console.error('Error in Register.createNewClient:', err);
			throw new Error('server error');
		}

		return client.id;
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
	},

	async logout(email, syncSessionID) {
		const emailHash = await Register.getEmailHash(email);
		const client = await Register.getClientBySyncSessionID(syncSessionID);

		if (!client || client.emailHash !== emailHash)
			throw new Error('session not found');

		await destroySyncSession(client.id, syncSessionID);

		return true;
	}
};

if (cluster.isMaster) {
	const clientExpireEvent = `__keyevent@${config.redis.nodisk.db.newAccounts}__:expired`;

	const newAccountsMonitor = new Redis({
		port: config.redis.nodisk.port,
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
exports.logout = Register.logout;

const {createSyncSession, destroySyncSession} = require('controllers/syncSession');
