/*
* @Last modified in Sublime on Feb 05, 2017 01:02:59 PM
*/

'use strict';

const {createNewClient, verifyNewClient, login} = require('../../controllers/register');
const {updateSyncSession} = require('../../controllers/syncSession');

module.exports = {
	async setMaster(req, res) {
		return res.json('OK');
	}
};
