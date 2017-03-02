/*
* @Last modified in Sublime on Mar 01, 2017 04:27:51 PM
*/
'use strict';

const router = require('express').Router();
const morgan = require('morgan');
const rfs = require('rotating-file-stream');
const clientRoutes = require('routes/api/client');
const dataRoutes = require('routes/api/data');
const {bruteforce} = require('routes/api/bruteforce');
const {app} = require('app');
const {Utilities} = require('shared/utilities');

morgan.token('tzdate', () => Utilities.date('d/t/Y:H:M:s z'));

const fileNameGenerator = (index) => {
	if (!index)
		return `logs/${app.get('env')}/api/access.log`;

	return `logs/${app.get('env')}/api/access.${index}.log`;
};

router.use(morgan(app.get('log-format'), {
	stream: rfs(fileNameGenerator, {
		size: '2M',
		rotate: 7
	})
}));

router.get('/', bruteforce.prevent, (req, res) => {
	res.sendStatus(200);
});

router.post('/client/logout', clientRoutes.requireEncryptedData, clientRoutes.logout);
router.post('/client/ping', clientRoutes.requireEncryptedData, clientRoutes.ping);
router.post('/client/sync/setting/add', clientRoutes.requireEncryptedData, dataRoutes.syncSettingAdd);
router.post('/client/sync/setting/get', clientRoutes.requireValidSyncSession, dataRoutes.syncSettingGet);

module.exports = router;
