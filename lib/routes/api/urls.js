/*
* @Last modified in Sublime on Feb 23, 2017 12:22:02 PM
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

router.post('/client/register', bruteforce.prevent, clientRoutes.register);
router.post('/client/verify', bruteforce.prevent, clientRoutes.verify);
router.post('/client/login', bruteforce.prevent, clientRoutes.login);
router.post('/client/logout', bruteforce.prevent, clientRoutes.logout);
router.post('/client/ping', clientRoutes.requireValidSyncSession, clientRoutes.ping);
router.post('/client/sync/setting/bulk', clientRoutes.requireValidSyncSession, dataRoutes.syncSettingBulk);
router.post('/client/sync/setting/replay', clientRoutes.requireValidSyncSession, dataRoutes.syncSettingReplay);

module.exports = router;
