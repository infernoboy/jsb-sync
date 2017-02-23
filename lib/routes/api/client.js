/*
* @Last modified in Sublime on Feb 23, 2017 11:52:04 AM
*/

'use strict';

const {createNewClient, verifyNewClient, login, logout} = require('controllers/register');
const {updateSyncSession, syncSessionIsValid} = require('controllers/syncSession');
const {bruteforce} = require('routes/api/bruteforce');

function hasEmailPassword(req, res) {
	if (!req.body.email) {
		res.json({
			error: 'missing email'
		});

		return false;
	}

	if (!req.body.password) {
		res.json({
			error: 'missing password'
		});

		return false;
	}

	return true;
}

module.exports = {
	requireValidSyncSession(req, res, next) {
		bruteforce.prevent(req, res, async () => {
			if (!req.body.syncSessionID)
				return res.json({
					error: 'missing syncSessionID'
				});

			if (await syncSessionIsValid(req.body.syncSessionID, req))
				return next();
			
			return res.json({
				error: 'invalid syncSessionID'
			});
		});
	},

	async register(req, res) {
		if (!hasEmailPassword(req, res))
			return;

		let clientID;

		try {
			clientID = await createNewClient(req.body.email, req.body.password);
		} catch (err) {
			return res.json({
				error: err.message
			});
		}

		return res.json({
			clientID,
			result: 'created new client'
		});
	},

	async verify(req, res) {
		if (!req.body.email)
			return res.json({
				error: 'missing email'
			});

		if (!req.body.verificationKey)
			return res.json({
				error: 'missing verification key'
			});

		try {
			await verifyNewClient(req.body.email, req.body.verificationKey);
		} catch (err) {
			return res.json({
				error: err.message
			});
		}

		return res.json({
			result: 'verified new client'
		});
	},

	async login(req, res) {
		if (!hasEmailPassword(req, res))
			return;

		let data;

		try {
			data = await login(req.body.email, req.body.password, req);
		} catch (err) {
			return res.json({
				error: err.message
			});
		}

		return res.json({
			data,
			result: 'login successful'
		});
	},

	async logout(req, res) {
		try {
			await logout(req.body.email, req.body.syncSessionID, req);
		} catch (err) {
			return res.json({
				error: err.message
			});
		}

		return res.json({
			result: 'logout successful'
		});
	},

	async ping(req, res) {
		res.json({
			result: 'ok'
		});

		try {
			await updateSyncSession(req.body.syncSessionID);
		} catch (err) {
			console.error('Error in Session.update:', err);
		}
	}
};
