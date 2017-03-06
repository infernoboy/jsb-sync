/*
* @Last modified in Sublime on Mar 06, 2017 05:28:54 PM
*/

'use strict';

const uuidv4 = require('uuid/v4');
const cluster = require('cluster');
const Redis = require('ioredis');
const extend = require('object-extend');
const CryptoJSCore = require('crypto-js/core');
const {accounts, newAccounts, config} = require('app');
const {Hash, Email} = require('shared/utilities');

const Register = {
	async getEmailHash(email) {
		if (typeof email !== 'string')
			email = '';

		email = email.normalize('NFKC').toLowerCase().trim();

		return await Hash.generateWithSalt(email, config.emailSalt, 5);
	},

	async clientWithEmailHashExists(emailHash) {
		return await newAccounts.hexists('emailHash', emailHash) || await accounts.hexists('emailHash', emailHash);
	},

	async getClientByField(field, key, store = accounts) {
		const clientID = await store.hget(field, key);

		if (clientID)
			return await Register.getClientByID(clientID, store);
	},

	async getClientByEmail(email, store = accounts) {
		return await Register.getClientByField('emailHash', await Register.getEmailHash(email), store);
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
		if (typeof email !== 'string')
			throw new Error('invalid email');

		if (typeof verificationKey !== 'string')
			throw new Error('invalid verification key');

		const emailHash = await Register.getEmailHash(email);
		const client = await Register.getClientByEmailHash(emailHash);

		if (client)
			throw new Error('client already verified');

		const newClient = await Register.getClientByEmailHash(emailHash, newAccounts);

		if (!newClient)
			throw new Error('client not found');

		if (newClient.verificationKey.toLowerCase().trim() !== verificationKey.toLowerCase().trim())
			throw new Error('invalid verification key');

		await Register.promoteNewClient(newClient);

		return 'verified new client';
	},

	async createNewClient(email, verifier, salt) {
		if (typeof email !== 'string' || email.length < 5 || !email.includes('@'))
			throw new Error('invalid email');

		const emailHash = await Register.getEmailHash(email);

		if (await Register.clientWithEmailHashExists(emailHash))
			throw new Error('client exists');
		
		let client = {
			emailHash,
			verifier,
			salt,
			id: uuidv4(),
			verificationKey: CryptoJSCore.lib.WordArray.random(128 / 8).toString()
		};

		try {
			await Register.emailVerificationKey(email, client.verificationKey);
		} catch (err) {
			throw new Error('server error');
		}

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

	emailVerificationKey(email, verificationKey) {
		const body = `Hello!

Your email address was used to sign up for JS Blocker Sync. If you did not do this, you can simply ignore this email. You will not receive any further correspondence.

Your verification key is: ${verificationKey}

To verify your account, open JS Blocker and go to Settings > Sync. Once there, click Verify and enter the verification key.

Thank you using JS Blocker!

Travis~`;

		return Email.send(email, 'Your JS Blocker Sync verification key', body, 'jsb@toggleable.com');
	},

	async logout(clientSession) {
		if (!clientSession)
			throw new Error('session not found');

		await destroySyncSession(clientSession.clientID, clientSession.id);

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
exports.getClientByEmail = Register.getClientByEmail;
exports.getClientByID = Register.getClientByID;
exports.getClientBySyncSessionID = Register.getClientBySyncSessionID;
exports.createNewClient = Register.createNewClient;
exports.verifyNewClient = Register.verifyNewClient;
exports.logout = Register.logout;

const {destroySyncSession} = require('controllers/syncSession');
