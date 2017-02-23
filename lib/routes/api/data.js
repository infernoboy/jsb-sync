/*
* @Last modified in Sublime on Feb 23, 2017 12:22:14 PM
*/

'use strict';

const {Client} = require('controllers/client');

module.exports = {
	async syncSettingBulk(req, res) {
		res.json(await Client.addBulk(req.body.syncSessionID, req.body.bulk));
	},

	async syncSettingReplay(req, res) {
		res.json(await Client.replay(req.body.syncSessionID, req.body.since));
	}
};
