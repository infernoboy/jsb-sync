/*
* @Last modified in Sublime on Mar 11, 2017 03:10:24 AM
*/

'use strict';

const jsrp = require('jsrp');
const {createNewClient, verifyNewClient, getClientByEmail, logout, logoutAll, changePassword} = require('controllers/register');
const {createSyncSession, sessionForClient} = require('controllers/syncSession');
const {SRPEvents} = require('app');

class SRPNegotiation {
	constructor(socket) {
		this.authenticated = false;
		this.socket = socket;

		this.listeners = {
			register: this.register,
			verify: this.verify,
			validateClient: this.validateClient,
			checkClientProof: this.checkClientProof,
			changePassword: this.changePassword,
			getSyncSessionID: this.getSyncSessionID,
		};

		for (let [name, listener] of Object.entries(this.listeners))
			this.socket
				.removeAllListeners(name)
				.on(name, listener.bind(this));

		this.socket.emit('ready');
	}

	done() {
		for (let name in this.listeners)
			if (this.listeners.hasOwnProperty(name))
				this.socket.removeAllListeners(name);

		this.socket.emit('done');
	}

	async register(data) {
		let clientID;

		try {
			clientID = await createNewClient(data.email, data.verifier, data.salt);
		} catch (err) {
			return this.socket.emit('SRPError', err.message);
		}

		this.socket.emit('registered', clientID);
	}

	async verify(data) {
		try {
			await verifyNewClient(data.email, data.verificationKey);
		} catch (err) {
			return this.socket.emit('SRPError', err.message);
		}

		this.socket.emit('verified');
	}

	async validateClient(data) {
		const syncClient = await getClientByEmail(data.email);

		if (!syncClient)
			return this.socket.emit('SRPError', 'client not found');

		this.syncClient = syncClient;

		this.server = new jsrp.server();

		this.server.init({
			salt: syncClient.salt,
			verifier: syncClient.verifier
		}, () => {
			this.server.setClientPublicKey(data.publicKey);

			this.socket.emit('getClientProof', {
				serverSalt: this.server.getSalt(),
				serverPublicKey: this.server.getPublicKey()
			});
		});
	}

	checkClientProof(clientProof) {
		if (typeof clientProof !== 'string' || !this.server.checkClientProof(clientProof))
			return this.socket.emit('SRPError', 'invalid password');

		this.authenticated = true;

		this.socket.emit('checkServerProof', this.server.getProof());
	}

	async changePassword(data) {
		if (!this.authenticated)
			return this.socket.emit('SRPError', 'not authenticated');

		try {
			await logoutAll(this.syncClient);
		} catch (err) { /* logoutAll can fail silently */ }

		if (typeof data.salt !== 'string' || typeof data.verifier !== 'string')
			return this.socket.emit('SRPError', 'invalid verifier');

		try {
			await changePassword(this.syncClient, data);
		} catch (err) {
			return this.socket.emit('SRPError', err.message);
		}

		this.socket.emit('passwordChanged');

		this.done();
	}

	async getSyncSessionID(previousSyncSessionID) {
		if (!this.authenticated)
			return this.socket.emit('SRPError', 'not authenticated');

		try {
			await logout(await sessionForClient(this.syncClient.id, previousSyncSessionID));
		} catch (err) { /* logout can fail silently */ }

		let syncSessionID;

		console.log(this.syncClient, this.socket.handshake.headers['x-client-ip']);

		try {
			syncSessionID = await createSyncSession(this.syncClient, this.server.getSharedKey(), this.socket.handshake.headers['x-client-ip']);
		} catch (err) {
			return this.socket.emit('SRPError', err.message);
		}

		this.socket.emit('syncSessionID', syncSessionID);

		this.done();
	}
}

SRPEvents.on('connection', (socket) => new SRPNegotiation(socket));

exports.SRPNegotiation = SRPNegotiation;
