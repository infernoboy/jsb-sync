/*
* @Last modified in Sublime on Mar 01, 2017 07:37:45 PM
*/

'use strict';

const cluster = require('cluster');
const {Log} = require('shared/utilities');

const Workers = {
	shutdown(restart = false) {
		Log('Server gracefully shutting down.');

		let workerPIDs = [];

		for (let [, worker] of Object.entries(cluster.workers)) {
			workerPIDs.push(worker.process.pid);

			worker.send({
				type: 'graceful-shutdown'
			});
		}

		setTimeout(function () {
			for (let [, worker] of Object.entries(cluster.workers))
				if (workerPIDs.includes(worker.process.pid)) {
					Log(`Worker ${worker.process.pid} did not gracefully shutdown`);

					process.kill(worker.process.pid, 'SIGKILL');
				}

			if (!restart)
				process.exit(0);
		}, 10000, workerPIDs);

		if (restart)
			Workers.init();
	},

	fork() {
		cluster.fork().on('message', (message) => {
			if (message.relay)
				for (let [, worker] of Object.entries(cluster.workers))
					worker.send(message);
		});
	},

	send(message) {
		for (let workerID in cluster.workers)
			if (cluster.workers.hasOwnProperty(workerID))
				cluster.workers[workerID].send(message);
	},

	init() {
		if (cluster.isMaster) {
			Log(`Setting up ${Workers.workers} workers.`);

			for (let workerID = Workers.workers; workerID--;)
				Workers.fork();
		} else
			Log(`Worker ${process.pid} is alive.`);
	}
};

if (cluster.isMaster && !module.parent.parent.parent) {
	Log(`Master PID: ${process.pid}`);

	cluster.on('exit', (deadWorker, code, signal) => {
		Log(`Worker ${deadWorker.process.pid} died: ${signal || code || 'shutdown'}`);

		if (code !== 0 && signal !== 'SIGKILL')
			Workers.fork();
	});

	process
		.on('SIGTERM', Workers.shutdown)
		.on('SIGHUP', () =>	Workers.shutdown(true));
}
module.exports = (workers) => {
	Workers.workers = workers;

	return Workers;
};
