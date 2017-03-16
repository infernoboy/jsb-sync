/*
* @Last modified in Sublime on Mar 15, 2017 12:28:08 AM
*/

'use strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const http = require('http');
const SocketIO = require('socket.io');
const path = require('path');
const cluster = require('cluster');
const Redis = require('ioredis');
const RedisStore = require('connect-redis')(session);
const config = require('configs/config');
const {Log, Utilities} = require('shared/utilities');
const EventEmitter = require('events');

class SRPEventEmitter extends EventEmitter {}

const SRPEvents = new SRPEventEmitter();

if (!module.parent.parent) {
	process.on('uncaughtException', (error) => {
		console.error('-'.repeat(45));
		console.error(Utilities.date('[y/m/d H:M:s]'), error ? (error.stack || error) : error);

		process.exit(1);
	});

	process.on('unhandledRejection', (reason, promise) => {
		console.error('-'.repeat(45));
		console.error(Utilities.date('[y/m/d H:M:s]'), 'Unhandled promise rejection:', reason);
		console.error('-'.repeat(18) + '>', promise);

		process.exit(1);
	});

	const Workers = require('clusters')(config.workers);

	Workers.init();
}

function redisErrorHandler(err) {
	if (err.code === 'ECONNREFUSED') {
		console.error('Redis unavailable, exiting. tried:', err.address, err.port);
		process.exit(2);
	}
}

const app = express();

app.disable('x-powered-by');

app.set('env', process.env.NODE_ENV);

const newAccounts = new Redis({
	host: config.redis.nodisk.host || 'localhost',
	port: config.redis.nodisk.port,
	db: config.redis.nodisk.db.newAccounts,
	dropBufferSupport: true
});

newAccounts.on('error', redisErrorHandler);

const accounts = new Redis({
	host: config.redis.disk.host || 'localhost',
	port: config.redis.disk.port,
	db: config.redis.disk.db.accounts,
	dropBufferSupport: true
});

accounts.on('error', redisErrorHandler);

const syncSession = new Redis({
	host: config.redis.disk.host || 'localhost',
	port: config.redis.disk.port,
	db: config.redis.disk.db.syncSession
});

syncSession.on('error', redisErrorHandler);

app.set('log-format', ':remote-addr - :remote-user [:tzdate] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms');
app.set('port', process.env.NODE_PORT || config.port);
app.set('supertest', `http://localhost:${app.get('port')}`);
app.set('json spaces', 2);
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'public'));

app.use(bodyParser.urlencoded({
	extended: true,
	limit: '15mb'
}));

app.use(bodyParser.json({
	limit: '15mb'
}));

app.use('/static', express.static(path.join(__dirname, 'public/static'), {
	maxAge: 1
}));

app.use(session({
	store: new RedisStore({
		host: config.redis.disk.host || 'localhost',
		port: config.redis.disk.port,
		db: config.redis.disk.db.session
	}),
	secret: config.cookieSecret,
	resave: false,
	saveUninitialized: false,
	cookie: {
		secure: false
	}
}));

function startSocketIOServer(server) {
	const io = SocketIO(server);
	const ioSRP = io.of('srp');

	io.set('transports', ['websocket']);

	io.origins((origin, callback) => callback(null, config.webSocketOrigins.includes(origin)));

	ioSRP.on('connection', (socket) => SRPEvents.emit('connection', socket));

	return { io, ioSRP };
}

if (!module.parent.parent)
	if (!cluster.isMaster) {
		const server = http.createServer(app);

		server.listen(app.get('port'), config.listen);

		let socketServer = startSocketIOServer(server);

		process
			.on('SIGTERM', () => socketServer.io.server && socketServer.io.server.close())
			.on('SIGHUP', () => {
				socketServer.io.server && socketServer.io.server.close();

				socketServer = startSocketIOServer();
			})
			.on('message', (message) => {
				if (message.type === 'graceful-shutdown') {
					Log(`Worker ${process.pid} gracefully shutting down.`);

					if (server.close)
						server.close(() => process.exit(0));

					setTimeout(() => {
						Log(`Failed to gracefully shutdown worker ${cluster.worker.pid}`);

						process.exit(1);
					}, 10000);
				}
			});
	} else
		Log(`Running in ${app.get('env')} mode.`);

exports.newAccounts = newAccounts;
exports.accounts = accounts;
exports.syncSession = syncSession;
exports.app = app;
exports.config = config;
exports.SRPEvents = SRPEvents;
exports.redisErrorHandler = redisErrorHandler;

require('routers');
require('controllers/srp');
