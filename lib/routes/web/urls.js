/*
* @Last modified in Sublime on Feb 04, 2017 10:02:25 AM
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

router.get('/time', (req, res) => {
	res.render('index', {
		time: Date.now()
	});
});

module.exports = router;
