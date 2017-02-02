/*
* @Last modified in Sublime on Feb 02, 2017 06:41:12 AM
*/

'use strict';

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const http = require('http');
const path = require('path');
const cluster = require('cluster');
const redis = require('redis');
const RedisStore = require('connect-redis')(session);
const {Log, Utilities} = require('./shared/utilities');
const Workers = require('./clusters');

process.on('uncaughtException', (error) => {
	console.error('-'.repeat(45));
	console.error(Utilities.date('[y/m/d H:M:s]'), error.stack || error);

	process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
	console.error('-'.repeat(45));
	console.error(Utilities.date('[y/m/d H:M:s]'), 'Unhandled promise rejection:', reason);
	console.error('-'.repeat(18) + '>', promise);
});

if (!module.parent.parent)
	Workers.init();

const node_env = process.env.NOD_ENV || 'development';

const newAccounts = redis.createClient();

newAccounts.select(1);

const accounts = redis.createClient();

accounts.select(2);

const keys = redis.createClient();

keys.select(3);

const app = express();
const logFormat = ':remote-addr - :remote-user [:tzdate] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

app.set('port', node_env === 'development' ? 11171 : 11172);
app.set('json spaces', 2);

app.use(bodyParser.urlencoded({
	extended: true
}));

app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public'), {
	maxAge: 1
}));

app.use(session({
	store: new RedisStore({
		db: 4
	}),
	secret: 'bcd21323-03e9-4413-ba18-0cac718fa445',
	resave: false,
	saveUninitialized: false,
	cookie: {
		secure: false
	}
}));

if (!module.parent.parent)
	if (!cluster.isMaster) {
		const server = http.createServer(app);

		server.listen(app.get('port'), '0.0.0.0');
	} else
		Log(`Running in ${node_env} mode.`);

exports.newAccounts = newAccounts;
exports.accounts = accounts;
exports.keys = keys;
exports.logFormat = logFormat;
exports.app = app;
exports.nod_env = node_env;

require('./routers');
