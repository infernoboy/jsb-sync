/*
* @Last modified in Sublime on Mar 14, 2017 06:43:36 AM
*/

'use strict';

const {spawn} = require('child_process');
const cluster = require('cluster');
const Redis = require('ioredis');
const CryptoJS = require('crypto-js');
const {syncSession, config, redisErrorHandler} = require('app');
const {Utilities} = require('shared/utilities');
const msgpack = require('msgpack5')();
const {updateClient, getClientByID, getClientBySyncSessionID} = require('controllers/register');

const SyncSession = {
	validTime: 60 * 60 * 24 * 7,

	async cleanup() {
		const clients = await syncSession.keys('syncSession:client:*');

		for (let i = clients.length; i--;) {
			let clientSessions = await syncSession.hgetallBuffer(clients[i]);

			for (let [syncSessionID, session] of Object.entries(clientSessions)) {
				session = msgpack.decode(session);

				if ((await syncSession.get(`syncSession:expire:${session.clientID}:${syncSessionID}`)) === null )
					await SyncSession.destroy(session.clientID, syncSessionID);
			}		
		}

		const sessions = await syncSession.keys('syncSession:expire:*');

		for (let i = sessions.length; i--;) {
			let sessionInfo = sessions[i].split(':').splice(2);
			let clientInfo = await syncSession.hgetall(`syncSession:client:${sessionInfo[0]}`);

			if (clientInfo === null || !Object.keys(clientInfo).length)
				await SyncSession.destroy(sessionInfo[0], sessionInfo[1]);
		}
	},

	async create(client, sharedKey, ip) {
		const sessionInfo = {
			sharedKey,
			ip,
			id: CryptoJS.lib.WordArray.random(256 / 8).toString(),
			clientID: client.id
		};

		try {
			await syncSession.pipeline()
				.hsetBuffer(`syncSession:client:${client.id}`, sessionInfo.id, msgpack.encode(sessionInfo))
				.setex(`syncSession:expire:${client.id}:${sessionInfo.id}`, SyncSession.validTime, 1)
				.exec();

			await updateClient(client, {
				syncSessionID: sessionInfo.id
			});
		} catch (err) {
			console.error('Error in SyncSession.create:', err);
			throw new Error('server error');
		}

		return sessionInfo.id;
	},

	async destroy(clientID, syncSessionID) {
		const client = await getClientByID(clientID);

		if (client) {
			client.syncSessionID = syncSessionID;

			updateClient(client, {
				syncSessionID: syncSessionID === true ? true : ''
			});
		}

		if (syncSessionID === true) {
			await syncSession.pipeline()
				.del(`syncSession:client:${clientID}`)
				.exec();

			SyncSession.cleanup();
		} else
			await syncSession.pipeline()
				.hdel(`syncSession:client:${clientID}`, syncSessionID)
				.del(`syncSession:expire:${clientID}:${syncSessionID}`)
				.exec();

		return true;
	},

	async update(clientSession) {
		if (clientSession)
			syncSession.setex(`syncSession:expire:${clientSession.clientID}:${clientSession.id}`, SyncSession.validTime, 1);
	},

	async getSessionForClient(clientID, syncSessionID) {
		const clientSyncSession = await syncSession.hgetBuffer(`syncSession:client:${clientID}`, syncSessionID);

		if (clientSyncSession)
			return msgpack.decode(clientSyncSession);

		return false;
	},

	async getSessionsForClient(clientID) {
		const clientSyncSessionIDs = await syncSession.hkeys(`syncSession:client:${clientID}`);

		if (clientSyncSessionIDs && clientSyncSessionIDs.length)
			return clientSyncSessionIDs;

		return false;
	},

	async isValid(syncSessionID, req) {
		const client = await getClientBySyncSessionID(syncSessionID);

		if (!client)
			return false;

		const clientSyncSession = await SyncSession.getSessionForClient(client.id, syncSessionID);

		if (clientSyncSession)
			if (clientSyncSession.ip === Utilities.getIP(req))
				return clientSyncSession;
			else
				await SyncSession.destroy(client.id, syncSessionID);

		return false;
	},

	async decryptClientData(clientSession, data) {
		if (!clientSession)
			throw new Error('invalid session');

		return JSON.parse(CryptoJS.AES.decrypt(data, clientSession.sharedKey).toString(CryptoJS.enc.Utf8));
	},

	async encryptClientData(clientSession, data) {
		return new Promise((resolve, reject) => {
			if (!clientSession)
				throw new Error('invalid session');

			const string = JSON.stringify(data);
			const openssl = spawn('openssl', ['aes-256-cbc', '-A', '-salt', '-base64', '-k', clientSession.sharedKey], {
				detached: true
			});

			let encryptedData = '';

			openssl.stdout.on('data', (data) => encryptedData += data.toString());

			openssl.stdin.write(string);
			openssl.stdin.end();

			openssl.on('close', (code) => {
				if (code === 0)
					resolve(encryptedData);
				else
					reject(code);
			});
		});
	}
};

if (cluster.isMaster) {
	const syncSessionExpireEvent = `__keyevent@${config.redis.disk.db.syncSession}__:expired`;

	const syncSessionMonitor = new Redis({
		port: config.redis.nodisk.port,
		db: config.redis.nodisk.db.syncSession,
		dropBufferSupport: true
	});

	syncSessionMonitor.on('error', redisErrorHandler);

	syncSessionMonitor.subscribe(syncSessionExpireEvent, (err) => {
		if (err)
			throw new Error('failed to subscribe to expired event for syncSession');
	});

	syncSessionMonitor.on('message', (channel, message) => {
		if (channel === syncSessionExpireEvent)
			SyncSession.destroy(...message.split(':').slice(2));
	});

	SyncSession._cleanupTimer = setInterval(() => SyncSession.cleanup(), 60 * 60 * 24);

	SyncSession.cleanup();
}

exports.createSyncSession = SyncSession.create;
exports.sessionForClient = SyncSession.getSessionForClient;
exports.sessionsForClient = SyncSession.getSessionsForClient;
exports.updateSyncSession = SyncSession.update;
exports.syncSessionIsValid = SyncSession.isValid;
exports.decryptClientData = SyncSession.decryptClientData;
exports.encryptClientData = SyncSession.encryptClientData;
exports.destroySyncSession = SyncSession.destroy.bind(SyncSession);
