/*
* @Last modified in Sublime on Feb 03, 2017 03:30:39 PM
*/

'use strict';

const cluster = require('cluster');
const {Log} = require('./shared/utilities');

const Workers = {
	fork() {
		cluster.fork().on('message', (message) => {
			if (message.relay)
				for (let [, worker] of Object.entries(cluster.workers))
					worker.send(message);
		});
	},

	restart(reason) {		
		Log(`Restarting workers: ${reason}`);

		Object.keys(cluster.workers).forEach((workerID) => {
			cluster.workers[workerID].send({
				type: 'shutdown',
				from: 'master'
			});

			setTimeout((workerID) => {
				if (cluster.workers[workerID])
					cluster.workers[workerID].kill('SIGKILL');
			}, 6000);
		});
	},

	send(message) {
		for (let workerID in cluster.workers)
			if (cluster.workers.hasOwnProperty(workerID))
				cluster.workers[workerID].send(message);
	},

	init() {
		if (cluster.isMaster) {
			const cpus = new Array(Workers.workers);

			Log(`Setting up ${cpus.length} workers.`);

			for (let _ of cpus)
				Workers.fork();

			cluster.on('exit', (deadWorker, code, signal) => {
				Log(`Worker ${deadWorker.process.pid} died: ${signal || code || 'shutdown'}`);

				Workers.fork();
			});
		} else {
			process.on('message', (message) => {
				switch (message.type) {
					case 'shutdown':
						process.exit(0);
				}
			});

			Log(`Worker ${process.pid} is alive.`);
		}
	}
};

if (cluster.isMaster && !module.parent.parent.parent) {
	Log(`Master PID: ${process.pid}`);

	process.on('SIGHUP', () => Workers.restart('SIGHUP'));
}

module.exports = (workers) => {
	Workers.workers = workers;

	return Workers;
};
