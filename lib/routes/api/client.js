/*
* @Last modified in Sublime on Mar 01, 2017 06:49:05 PM
*/

'use strict';

const {logout} = require('controllers/register');
const {updateSyncSession, syncSessionIsValid, decryptClientData} = require('controllers/syncSession');
const {bruteforce} = require('routes/api/bruteforce');

function requireValidSyncSession(req, res, next) {
	bruteforce.prevent(req, res, async () => {
		if (!req.body.syncSessionID)
			return res.json({
				error: 'missing syncSessionID'
			});

		const clientSession = await syncSessionIsValid(req.body.syncSessionID, req);

		if (clientSession) {
			req.clientSession = clientSession;

			return next();
		}
		
		return res.json({
			error: {
				name: 'invalid syncSessionID'
			}
		});
	});
}

module.exports = {
	requireValidSyncSession: requireValidSyncSession,

	async requireEncryptedData(req, res, next) {
		requireValidSyncSession(req, res, async () => {
			if (!req.body.encryptedData)
				return res.json({
					error: 'missing encryptedData'
				});

			let decryptedData;

			try {
				decryptedData = await decryptClientData(req.clientSession, req.body.encryptedData);

				req.body.decryptedData = decryptedData;

				next();
			} catch (err) {
				console.log(err);

				return res.json({
					error: 'invalid encryptedData'
				});
			}
		});
	},

	async logout(req, res) {
		if (req.body.decryptedData === req.body.syncSessionID) {
			try {
				await logout(req.clientSession);
			} catch (err) {
				return res.json({
					error: 'invalid session'
				});
			}

			return res.json({
				result: 'logout successful'
			});
		} else
			res.json({
				error: 'invalid session'
			});
	},

	async ping(req, res) {
		if (req.body.decryptedData === req.body.syncSessionID) {
			res.json({
				result: true
			});

			try {
				await updateSyncSession(req.clientSession);
			} catch (err) {
				console.error('Error in Session.update:', err);
			}
		} else
			res.json({
				error: 'invalid session'
			});	
	}
};
