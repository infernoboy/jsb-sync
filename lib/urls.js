/*
* @Last modified in Sublime on Feb 02, 2017 07:24:45 AM
*/
const router = require('express').Router();
const morgan = require('morgan');
// const routes = require('./lib/routes/web');
const {logFormat, node_env} = require('./app');
const {Utilities} = require('./shared/utilities');

morgan.token('tzdate', () => Utilities.date('d/t/Y:H:M:s z'));

router.use(morgan(logFormat, {
	stream: require('file-stream-rotator').getStream({
		date_format: 'YYYY-MM-DD',
		filename: `${__dirname}/../logs/${node_env}-%DATE%.log`,
		frequency: '7d',
		verbose: false
	})
}));

router.get('/', (req, res) => {
	res.send('hello');
});

module.exports = router;
