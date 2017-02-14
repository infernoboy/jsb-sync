/*
* @Last modified in Sublime on Feb 06, 2017 07:36:42 AM
*/

'use strict';

const {createNewClient, verifyNewClient, login} = require('controllers/register');
const {updateSyncSession} = require('controllers/syncSession');
const {Utilities, fs} = require('shared/utilities');

module.exports = {
	async syncUp(req, res) {
		return res.json('OK');
	}
};
