/*
* @Last modified in Sublime on Feb 20, 2017 11:12:14 AM
*/

'use strict';

const uuidv4 = require('uuid/v4');
const cluster = require('cluster');
const Redis = require('ioredis');
const {syncSession, config} = require('app');
const {Utilities} = require('shared/utilities');
const msgpack = require('msgpack5')();
const {updateClient, getClientByID, getClientBySyncSessionID} = require('controllers/register');

const SyncSession = {
	async cleanup() {
		const clients = await syncSession.keys('syncSession:client:*');

		for (let i = clients.length; i--;) {
			let clientSessions = await syncSession.hgetallBuffer(clients[i]);

			for (let [syncSessionID, session] of Object.entries(clientSessions)) {
				session = msgpack.decode(session);

				if ((await syncSession.get(`syncSession:expire:${session.clientID}:${syncSessionID}`)) === null )
					SyncSession.destroy(session.clientID, syncSessionID);
			}		
		}
	},

	async create(client, req) {
		const sessionInfo = {
			id: uuidv4(),
			clientID: client.id,
			ip: Utilities.getIP(req)
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
				syncSessionID: ''
			});
		}

		syncSession.pipeline()
			.hdel(`syncSession:client:${clientID}`, syncSessionID)
			.del(`syncSession:expire:${clientID}:${syncSessionID}`)
			.exec();

		return true;
	},

	async update(syncSessionID) {
		const client = await getClientBySyncSessionID(syncSessionID);

		if (client)
			syncSession.setex(`syncSession:expire:${client.id}:${syncSessionID}`, SyncSession.validTime, 1);
	},

	async getSessionForClient(client, syncSessionID) {
		const clientSyncSession = await syncSession.hgetBuffer(`syncSession:client:${client.id}`, syncSessionID);

		if (clientSyncSession)
			return msgpack.decode(clientSyncSession);

		return false;
	},

	async isValid(syncSessionID, req) {
		const client = await getClientBySyncSessionID(syncSessionID);

		if (!client)
			return false;

		const clientSyncSession = await SyncSession.getSessionForClient(client, syncSessionID);

		return clientSyncSession && clientSyncSession.ip === Utilities.getIP(req);
	}
};

SyncSession.validTime = 60 * 60 * 24 * 7;

if (cluster.isMaster) {
	const syncSessionExpireEvent = `__keyevent@${config.redis.disk.db.syncSession}__:expired`;

	const syncSessionMonitor = new Redis({
		port: config.redis.nodisk.port,
		db: config.redis.nodisk.db.syncSession,
		dropBufferSupport: true
	});

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
exports.sessionsForClient = SyncSession.sessionsForClient;
exports.updateSyncSession = SyncSession.update;
exports.syncSessionIsValid = SyncSession.isValid;
exports.destroySyncSession = SyncSession.destroy.bind(SyncSession);
