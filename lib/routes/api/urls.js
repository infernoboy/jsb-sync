/*
* @Last modified in Sublime on Feb 05, 2017 01:32:47 PM
*/
'use strict';

const router = require('express').Router();
const morgan = require('morgan');
const clientRoutes = require('./client');
const dataRoutes = require('./data');
const {bruteforce} = require('./bruteforce');
const {app} = require('../../app');
const {Utilities} = require('../../shared/utilities');

morgan.token('tzdate', () => Utilities.date('d/t/Y:H:M:s z'));

router.use(morgan(app.get('log-format'), {
	stream: require('file-stream-rotator').getStream({
		date_format: 'YYYY-MM-DD',
		filename: `${__dirname}/../../../logs/${app.get('env')}-%DATE%.log`,
		frequency: '7d',
		verbose: false
	})
}));

router.get('/', bruteforce.prevent, (req, res) => {
	res.sendStatus(200);
});

router.post('/client/register', bruteforce.prevent, clientRoutes.register);
router.post('/client/verify', bruteforce.prevent, clientRoutes.verify);
router.post('/client/login', bruteforce.prevent, clientRoutes.login);
router.post('/client/ping', clientRoutes.requireValidSession, clientRoutes.ping);
router.post('/client/data/setMaster', clientRoutes.requireValidSession, dataRoutes.setMaster);

module.exports = router;
