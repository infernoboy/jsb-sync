/*
* @Last modified in Sublime on Mar 01, 2017 01:30:10 AM
*/

'use strict';

const {Client} = require('controllers/client');
const {encryptClientData} = require('controllers/syncSession');

module.exports = {
	async syncSettingAdd(req, res) {
		try {
			const data = await Client.addSettings(req.clientSession, req.body.decryptedData.settings, req.body.decryptedData.since, req.body.decryptedData.isFullSettings);

			res.json({
				encryptedData: await encryptClientData(req.clientSession, data),
				result: true
			});
		} catch (err) {
			res.json({
				error: err.message
			});
		}
	},

	async syncSettingGet(req, res) {
		try {
			const data = await Client.getSettings(req.clientSession, req.body.since);

			res.json({
				encryptedData: await encryptClientData(req.clientSession, data),
				result: true
			});
		} catch (err) {
			res.json({
				error: err.message
			});
		}
	}
};
