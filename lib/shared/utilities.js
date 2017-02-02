/*
* @Last modified in Sublime on Feb 02, 2017 03:46:51 AM
*/

'use strict';

if (!Object.entries)
	require('object.entries').shim();

const crypto = require('crypto');
const cluster = require('cluster');
const path = require('path');
const fs = require('fs');

let Extension = {
	String: {
		_pluralize: {
			value: function (number) {
				return number === 1 ? this : this + 's';
			}
		},

		_ucfirst: {
			value: function() {
				return this.substr(0, 1).toUpperCase() + this.substr(1);
			}
		},

		_lpad: {
			value: function (length, string = ' ') {
				const paddingLength = length - this.length;

				if (paddingLength <= 0)
					return this;

				return (new Array(paddingLength + 1)).join(string) + this;
			}
		},

		_rpad: {
			value: function (length, string = ' ') {
				const paddingLength = length - this.length;

				if (paddingLength <= 0)
					return this;

				return this + (new Array(paddingLength + 1)).join(string);
			}
		}
	},

	Object: {
		_createReverseMap: {
			value: function(deep) {
				for (let [key, value] of Object.entries(this))
					if (deep && (value instanceof Object))
						this[key] = value._createReverseMap(deep);
					else
						this[value] = key;

				return this;
			}
		}
	},

	Array: {
		_toEnum: {
			value: function(Anchor) {
				if (typeof Anchor !== 'function')
					throw new Error(`${Anchor} is not a function.`);

				Anchor.prototype.get = function (key) {
					if (typeof key === 'string' && key.includes('.')) {
						const splitKey = key.split('.');

						if (splitKey[0] === this.constructor.name)
							key = splitKey[1];
					}

					if (this.hasOwnProperty(key))
						return this[key];
				
					return null;
				};

				if (!this.includes('None'))
					this.unshift('None');
				
				let anchor = new Anchor;
				let ordinal = 0;

				for (let key of this)
					anchor[key] = {
						name: key,
						ordinal: ordinal++,
						toString() {
							return `${anchor.constructor.name}.${key}`;
						},
						toJSON() {
							return this.toString();
						}
					};

				Object.freeze(anchor);

				return anchor;
			}
		}
	}
};

for (let [objectType, object] of Object.entries(Extension))
	Object.defineProperties(global[objectType].prototype, object);

Extension = undefined;

const Utilities = {
	dateFormat: '[y/m/d H:M:s]',
	logFilePath: `${process.env.HOME}/Library/Logs/surveillance.log`,

	humanTime(time) {
		let seconds = time / 1000;

		const humanTime = {};

		const units = {
			days: 24 * 60 * 60,
			hours: 60 * 60,
			minutes: 60,
			seconds: 1
		};

		for (let [unit, multiplier] of Object.entries(units))
			if (seconds / multiplier > 0) {
				let convertedUnit = Math.floor(seconds / multiplier);

				humanTime[unit] = convertedUnit;
				seconds -= convertedUnit * multiplier;
			} else
				humanTime[unit] = 0;

		return humanTime;
	},

	date(type) {
		const now = new Date();

		const formatter = {
			H: () => String(now.getHours())._lpad(2, '0'),
			M: () => String(now.getMinutes())._lpad(2, '0'),
			s: () => String(now.getSeconds())._lpad(2, '0'),
			Y: () => String(now.getFullYear()),
			y: () => String(now.getFullYear()).substr(2),
			m: () => String(now.getMonth() + 1)._lpad(2, '0'),
			t: () => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][now.getMonth()],
			d: () => String(now.getDate())._lpad(2, '0'),
			u: () => now.getTime(),
			x: () => String(Math.floor(((now.getTime() / 1000) % 1) * 1000))._rpad(3, '0'),
			P: () => (String(now.getHours()) > 12 ? 'PM' : 'AM'),
			p: () => (String(now.getHours()) > 12 ? 'pm' : 'pm'),
			h: (h) => ((h = now.getHours()) > 12) ? h - 12 : h,

			o: (upperCase) => {
				let ords = ['th', 'st', 'nd', 'rd'].map(ord => upperCase ? ord.toUpperCase() : ord);
				let val = now.getDate() % 100;

				return ords[(val - 20) % 10] || ords[val] || ords[0];
			},

			z: () => {
				const msOffset = now.getTimezoneOffset() * 60 * 1000;
				const humanTime = this.humanTime(Math.abs(msOffset));
				const direction = msOffset < 0 ? '+' : '-';

				return `${direction}${String(humanTime.hours)._lpad(2, '0')}${String(humanTime.minutes)._lpad(2, '0')}`;
			}
		};

		formatter.O = formatter.o.bind(this, true);

		let newString = '';

		for (let i of this.range(0, type.length))
			if (type[i] === '\\') i += 2;
			else
				newString += formatter[type[i]] ? type[i].replace(type[i], formatter[type[i]]) : type[i];

		return newString;
	},

	*range(start, end, step = 1) {
		while (start < end) {
			yield start;

			start += step;
		}
	},

	getIP(req) {
		return req.ips.concat(req.ip).join();
	},

	hmac(key, data) {
		return crypto.createHmac('sha384', key).update(data).digest('hex');
	}
};

class Abzu {
	constructor(time, every = 1000) {
		this._timeout = null;
		this._every = every;
		this._started = false;
		this._onTick = [];
		this._onEnd = [];
		this._onStopUser = [];

		this.userData = undefined;
		this.currentTick = 0;

		Object.defineProperty(this, 'time', {
			value: time * 1000
		});
	}

	get remainingTime() {
		const diff = this._started ? this.endTime - Date.now() : 0;

		return diff > 0 ? diff : null;
	}

	get remainingTimeSeconds() {
		const remainingTime = this.remainingTime;

		return remainingTime ? Math.ceil(remainingTime / 1000) : null;
	}

	get endTime() {
		return this._started ? this._startTime + this.time : null;
	}

	start() {
		if (this._started)
			return this;

		this.currentTick = 1;

		this._started = true;
		this._startTime = Date.now();

		this.tick();
	}

	restart() {
		this.stop(false);
		this.start();
	}

	tick() {
		if (!this._started)
			return;

		for (let [, action] of this._onTick.entries())
			if (typeof action === 'function')
				action(this);

		if (this.remainingTime > 0)
			this._timeout = setTimeout(this.tick.bind(this), this._every, this.currentTick++);
		else {
			for (let [, action] of this._onEnd.entries())
				if (typeof action === 'function')
					action(this);

			this.stop(false);
		}
	}

	stop(stoppedByUser = true) {
		if (!this._started)
			return;

		this._started = false;

		this.currentTick = 0;

		clearTimeout(this._timeout);

		if (stoppedByUser)
			for (let [, action] of this._onStopUser.entries())
				if (typeof action === 'function')
					action(this);

		this.userData = undefined;
	}

	clear() {
		this._onTick = [];
		this._onEnd = [];
		this._onStopUser = [];
	}

	onTick(fn) {
		this._onTick.push(fn);

		return this;
	}

	onEnd(fn) {
		this._onEnd.push(fn);

		return this;
	}

	onStopUser(fn) {
		this._onStopUser.push(fn);

		return this;
	}

	toJSON() {
		return {
			time: this.time,
			remainingTime: this.remainingTime,
			remainingTimeSeconds: this.remainingTimeSeconds,
			currentTick: this.remainingTimeSeconds ? this.currentTick - 1 : 0
		};
	}
}

class MessageWorker {
	static reply(info, message) {
		process.send({
			relay: true,
			messageWorker: {
				isReply: true,
				targetWorker: info.sender,
				targetID: info.targetID,
				sender: cluster.worker.id
			},
			data: message
		});
	}

	static received(message) {
		if (message.messageWorker && (message.messageWorker.targetWorker === true || message.messageWorker.targetWorker === cluster.worker.id) && !message.messageWorker.isReply)
			this._onReceive(message.data).then(MessageWorker.reply.bind(this, message.messageWorker));
	}

	static responseCallback(resolve, reject, message) {
		if (message.messageWorker && message.messageWorker.targetID === this.id && message.messageWorker.isReply)
			this._replies.push(message.data);

		clearTimeout(this._timeouts[this.id]);

		this._timeouts[this.id] = setTimeout(() => {
			resolve(this._replies);
		}, 100);
	}

	static unbind(method) {
		process.removeListener('message', method);
	}

	constructor(workerID = null) {
		this._timeouts = {};
		this._onReceive = () => Promise.reject();

		this.workerID = workerID;
		
		this.renewID();

		this._received = MessageWorker.received.bind(this);

		if (!workerID)
			process.on('message', this._received);
	}

	renewID() {
		clearTimeout(this._timeouts[this.id]);

		delete this._timeouts[this.id];

		this.id = Date.now() + Math.random();
		this._replies = [];
	}

	onReceive(fn) {
		this._onReceive = fn;
	}

	send(message, expectResponse = true, timeout = 5000) {
		return new Promise((resolve, reject) => {
			if (!this.workerID)
				reject(new Error('Listen only.'));

			this.renewID();

			const localResponseCallback = MessageWorker.responseCallback.bind(this, resolve, reject);

			if (expectResponse)
				process.on('message', localResponseCallback);

			setTimeout((localResponseCallback) => {
				MessageWorker.unbind(localResponseCallback);

				this.renewID();
			}, timeout, localResponseCallback);

			process.send({
				relay: true,
				messageWorker: {
					targetWorker: this.workerID,
					targetID: this.id,
					sender: cluster.worker.id
				},
				data: message
			});
		});
	}

	close() {
		process.removeListener('message', this._received);
	}
}

process.setMaxListeners(30);

const Log = function() {
	if (arguments[0] === 'DEBUG' && !DEBUG_MODE)
		return;

	console.log.apply(console, [Utilities.date('[y/m/d H:M:s]')].concat(Array.prototype.slice.call(arguments)));
};

exports.Utilities = Utilities;
exports.Log = Log;
exports.Abzu = Abzu;
exports.MessageWorker = MessageWorker;