/*
* @Last modified in Sublime on Feb 04, 2017 02:46:51 PM
*/
'use strict';

const router = require('express').Router();
const morgan = require('morgan');
const routes = require('./');
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

router.get('/', routes.bruteforce.prevent, (req, res) => {
	res.send('api');
});

router.post('/client/register', routes.bruteforce.prevent, routes.client.register);
router.post('/client/verify', routes.bruteforce.prevent, routes.client.verify);
router.post('/client/login', routes.bruteforce.prevent, routes.client.login);

module.exports = router;
