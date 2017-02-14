/*
* @Last modified in Sublime on Feb 13, 2017 08:23:04 PM
*/
'use strict';

const router = require('express').Router();
const morgan = require('morgan');
const rfs = require('rotating-file-stream');
const routes = require('routes/web');
const {app} = require('app');
const {Utilities} = require('shared/utilities');

morgan.token('tzdate', () => Utilities.date('d/t/Y:H:M:s z'));

const fileNameGenerator = (index) => {
	if (!index)
		return `logs/${app.get('env')}/web/access.log`;

	return `logs/${app.get('env')}/web/access.${index}.log`;
};

router.use(morgan(app.get('log-format'), {
	stream: rfs(fileNameGenerator, {
		size: '2M',
		rotate: 7
	})
}));

router.get('/time', (req, res) => {	
	res.render('index', {
		time: Date.now()
	});
});

module.exports = router;
