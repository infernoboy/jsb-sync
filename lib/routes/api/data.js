/*
* @Last modified in Sublime on Mar 14, 2017 04:30:18 AM
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
			console.log(1);
			const data = await Client.getSettings(req.clientSession, req.body.since);
			console.log(2, data);

			res.json({
				encryptedData: await encryptClientData(req.clientSession, data),
				result: true
			});

			console.log(3);
		} catch (err) {
			console.log(4, err);
			res.json({
				error: err.message
			});
		}
	}
};
