/*
* @Last modified in Sublime on Feb 13, 2017 05:45:21 PM
*/

'use strict';

if (!Object.entries)
	require('object.entries').shim();

const crypto = require('crypto');
const cluster = require('cluster');
const argon2 = require('argon2');
const lzutf8 = require('lzutf8');
const Bluebird = require('bluebird');
const config = require('configs/config');
const EventEmitter = require('events');

const DEBUG_MODE = false;

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

const RSA = {
	encryptWithPublicKey(string, key) {
		return crypto.publicEncrypt(key, Buffer.from(string, 'utf8')).toString('utf8');
	},
	decryptWithPrivateKey(string, key) {
		return crypto.privateDecrypt(key, Buffer.from(string, 'utf8'));
	}
};

const Hash = {
	async generateWithSalt(key, salt, timeCost = 3) {
		return await argon2.hash(key.normalize('NFKC'), salt.normalize('NFKC'), {
			timeCost,
			memoryCost: 13,
			parallelism: config.workers
		});
	},

	async generate(key, timeCost = 4) {
		return await argon2.hash(key.normalize('NFKC'), await argon2.generateSalt(), {
			timeCost,
			memoryCost: 16,
			parallelism: config.workers
		});
	},

	async verify(hash, password) {
		if (await argon2.verify(hash, password.normalize('NFKC')))
			return true;
		else
			throw new Error('mismatch');
	}
};

const Utilities = {
	dateFormat: '[y/m/d H:M:s]',
	logFilePath: `${process.env.HOME}/Library/Logs/surveillance.log`,

	async compress(data) {
		return new Promise((resolve, reject) => {
			lzutf8.compressAsync(data, { outputEncoding: 'BinaryString' }, (result, err) => {
				if (err)
					return reject(err);

				resolve(result);
			});
		});
	},

	async decompress(data) {
		return new Promise((resolve, reject) => {
			lzutf8.decompressAsync(data, { inputEncoding: 'BinaryString' }, (result, err) => {
				if (err)
					return reject(err);

				resolve(result);
			});
		});
	},

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

	date(type, now = null) {
		now = now || new Date();

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
		return req.ips.concat(req.headers['x-client-ip'] || req.ip).join();
	},

	hmac(key, data) {
		return crypto.createHmac('sha384', key).update(data).digest('hex');
	}
};

class Abzu extends EventEmitter {
	constructor(ticks, every = 1000) {
		super();

		this._timeout = null;
		this._every = every;
		this._started = false;
		this._ticks = ticks;

		this.iterations = 0;
		this.userData = undefined;
		this.currentTick = 0;
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
		return this._started ? this._startTime + ((this._ticks - 1) * this._every) : null;
	}

	start() {
		if (this._started)
			return this;

		this.iterations++;

		this.currentTick = 1;

		this._started = true;
		this._startTime = Date.now();

		process.nextTick(this.tick.bind(this));

		return this;
	}

	restart() {
		this.stop(false);

		this._timeout = setTimeout(this.start.bind(this), this._every);
	}

	tick() {
		if (!this._started)
			return;

		this.emit('tick');

		if (this.currentTick < this._ticks)
			this._timeout = setTimeout(this.tick.bind(this), this._every, this.currentTick++);
		else {
			this.stop(false);

			this.emit('end');
		}
	}

	stop(stoppedByUser = true) {
		if (!this._started && stoppedByUser)
			return;

		this._started = false;

		this.currentTick = 0;

		clearTimeout(this._timeout);

		if (stoppedByUser)
			this.emit('stop');

		this.userData = undefined;
	}

	clear() {
		this.removeAllListeners();
	}

	toJSON() {
		return {
			time: (this._ticks - 1) * this._every,
			remainingTime: this.remainingTime,
			remainingTimeSeconds: this.remainingTimeSeconds,
			currentTick: this.currentTick
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
				return reject(new Error('Listen only.'));

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

exports.RSA = RSA;
exports.Hash = Hash;
exports.Utilities = Utilities;
exports.Log = Log;
exports.Abzu = Abzu;
exports.MessageWorker = MessageWorker;
exports.fs = Bluebird.promisifyAll(require('fs-extra'));
