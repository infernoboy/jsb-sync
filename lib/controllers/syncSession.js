/*
* @Last modified in Sublime on Feb 05, 2017 01:32:50 PM
*/

'use strict';

const uuid = require('node-uuid');
const cluster = require('cluster');
const Redis = require('ioredis');
const {syncSession, config, app} = require('../app');
const {Utilities} = require('../shared/utilities');
const {updateClient, getClientByID, getClientBySyncSessionID} = require('./register');

const SyncSession = {
	async create(client, req) {
		const sessionInfo = {
			id: uuid.v4(),
			clientID: client.id,
			ip: Utilities.getIP(req)
		};

		try {
			await syncSession.pipeline()
				.hset(`syncSession:client:${client.id}`, sessionInfo.id, JSON.stringify(sessionInfo))
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

	async destroy(_syncSession, _expire, clientID, syncSessionID) {
		const client = await getClientByID(clientID);

		if (client) {
			client.syncSessionID = syncSessionID;

			updateClient(client, {
				syncSessionID: ''
			});
		}

		syncSession.hdel(`syncSession:client:${clientID}`, syncSessionID);

		return true;
	},

	async update(syncSessionID) {
		const client = await getClientBySyncSessionID(syncSessionID);

		if (client)
			syncSession.setex(`syncSession:expire:${client.id}:${syncSessionID}`, SyncSession.validTime, 1);
	},

	async getSessionForClient(client, syncSessionID) {
		const clientSyncSession = await syncSession.hget(`syncSession:client:${client.id}`, syncSessionID);

		if (clientSyncSession)
			return JSON.parse(clientSyncSession);

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
		port: app.get('redis-port:disk'),
		db: config.redis.nodisk.db.syncSession,
		dropBufferSupport: true
	});

	syncSessionMonitor.subscribe(syncSessionExpireEvent, (err) => {
		if (err)
			throw new Error('failed to subscribe to expired event for syncSession');
	});

	syncSessionMonitor.on('message', (channel, message) => {
		if (channel === syncSessionExpireEvent)
			SyncSession.destroy(...message.split(':'));
	});
}

exports.createSyncSession = SyncSession.create;
exports.sessionsForClient = SyncSession.sessionsForClient;
exports.updateSyncSession = SyncSession.update;
exports.syncSessionIsValid = SyncSession.isValid;
