/*
* @Last modified in Sublime on Feb 04, 2017 03:12:59 PM
*/

'use strict';

const Register = require('../../controllers/register');

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
	async register(req, res) {
		if (!hasEmailPassword(req, res))
			return;

		try {
			await Register.createNewClient(req.body.email, req.body.password);
		} catch (err) {
			return res.json({
				error: err.message
			});
		}

		return res.json({
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
			await Register.verifyNewClient(req.body.email, req.body.verificationKey);
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

		let syncSessionID;

		try {
			syncSessionID = await Register.login(req.body.email, req.body.password);
		} catch (err) {
			return res.json({
				error: err.message
			});
		}

		return res.json({
			syncSessionID,
			result: 'login successful',
		});
	}
};
