/*
* @Last modified in Sublime on Mar 08, 2017 12:28:25 PM
*/
'use strict';

const router = require('express').Router();
const morgan = require('morgan');
const rfs = require('rotating-file-stream');
// const routes = require('routes/web');
const {app} = require('app');
const {Utilities} = require('shared/utilities');

morgan.token('tzdate', () => Utilities.date('d/t/Y:H:M:s z'));

const fileNameGenerator = (index) => {
	if (!index)
		return `logs/${app.get('env')}/web/access.log`;

	return `logs/${app.get('env')}/web/access.${index}.log`;
};

if (app.get('env') === 'development')
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
