/*
* @Last modified in Sublime on Mar 01, 2017 07:13:07 PM
*/

'use strict';

const jsrp = require('jsrp');
const {createNewClient, verifyNewClient, getClientByEmail, logout} = require('controllers/register');
const {createSyncSession, sessionForClient} = require('controllers/syncSession');
const {SRPEvents} = require('app');

class SRPNegotiation {
	constructor(socket) {
		this.authenticated = false;
		this.socket = socket;

		this.listeners = {
			register: this.register,
			verify: this.verify,
			login: this.login,
			checkClientProof: this.checkClientProof,
			getSyncSessionID: this.getSyncSessionID
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

	async login(data) {
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

	async getSyncSessionID(previousSyncSessionID) {
		if (!this.authenticated)
			return this.socket.emit('SRPError', 'not authenticated');

		try {
			await logout(await sessionForClient(this.syncClient.id, previousSyncSessionID));
		} catch (err) { /* logout can fail silently */ }

		let syncSessionID;

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
