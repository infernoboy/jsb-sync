/*
* @Last modified in Sublime on Mar 14, 2017 04:35:09 AM
*/

'use strict';

const path = require('path');
const isPlainObject = require('is-plain-object');
const {FileStorage} = require('controllers/fileStorage');

const Client = {
	REQUEST_FULL_SYNC_AFTER: 50,

	newDeltaPath() {
		const time = Date.now();

		return {
			time: time,
			path: `delta/${time}/sync.json`
		};
	},

	isValidSettings(settings) {
		if (!isPlainObject(settings) || !Array.isArray(settings.settings))
			return false;

		if (Object.keys(settings)._diff(['isFullSettings', 'settings']).length)
			return false;

		const knownSettingsKeys = ['type', 'when', 'encryptionKey', 'encryptedKey', 'encryptedValue', 'encryptedStoreKey'];

		for (let i = settings.settings.length; i--;) {
			if (!isPlainObject(settings.settings[i]))
				return false;

			if (Object.keys(settings.settings[i])._diff(knownSettingsKeys).length)
				return false;

			if (!['set', 'store', 'remove'].includes(settings.settings[i].type))
				return false;

			if (typeof settings.settings[i].encryptionKey !== 'string' || typeof settings.settings[i].encryptedKey !== 'string')
				return false;

			switch (settings.settings[i].type) {
				case 'store':
					if (typeof settings.settings[i].encryptedValue !== 'string' || 
						!settings.settings[i].encryptedValue.length || 
						typeof settings.settings[i].encryptedStoreKey !== 'undefined')
						return false;
					break;
				case 'set':
					if (typeof settings.settings[i].encryptedValue !== 'string' || 
						!settings.settings[i].encryptedValue.length ||
						(typeof settings.settings[i].encryptedStoreKey !== 'undefined' && typeof settings.settings[i].encryptedStoreKey !== 'string'))
						return false;
					break;
				case 'remove':
					if (typeof settings.settings[i].encryptedValue !== 'undefined' ||
						(typeof settings.settings[i].encryptedStoreKey !== 'undefined' && typeof settings.settings[i].encryptedStoreKey !== 'string'))
						return false;
			}
		}

		return true;
	},

	async getStorage(clientSession) {
		if (!clientSession || !clientSession.clientID)
			throw new Error('invalid session');

		return new FileStorage(clientSession.clientID);
	},

	async smoosh(clientSession) {
		const settings = await Client.getSettings(clientSession, 0);
		const clientStorage = await Client.getStorage(clientSession);

		let smooshedSettings = [];
		let isFullSettings = false;

		if (settings.last) {
			const sorted = Object.keys(settings.settings).sort((a, b) => Number(a) > Number(b));

			for (let time in settings.settings)
				if (settings.settings.hasOwnProperty(time)) {
					await clientStorage.remove(`delta/${time}`);

					if (settings.settings[time].isFullSettings) {
						isFullSettings = true;

						smooshedSettings = settings.settings[time].settings;
					} else
						smooshedSettings = smooshedSettings.concat(settings.settings[time].settings);
				}
			
			await clientStorage.setContent(`delta/${sorted[0]}/sync.json`, {
				isFullSettings,
				settings: smooshedSettings
			});
		}

		return true;
	},

	async needsFullSettingsSync(clientSession) {
		const clientStorage = await Client.getStorage(clientSession);

		return (await clientStorage.list('delta')).length > Client.REQUEST_FULL_SYNC_AFTER;
	},

	async addSettings(clientSession, settings, since, isFullSettings) {
		if (!Client.isValidSettings(settings))
			throw new Error('invalid settings');

		const needsFullSettingsSync = (!isFullSettings && await Client.needsFullSettingsSync(clientSession));
		const pastSettings = await Client.getSettings(clientSession, since);
		const clientStorage = await Client.getStorage(clientSession);
		const newDeltaPath = Client.newDeltaPath();

		if (isFullSettings)
			await clientStorage.empty('delta');		

		await clientStorage.setContent(newDeltaPath.path, settings);

		return {
			pastSettings,
			needsFullSettingsSync,
			time: needsFullSettingsSync ? Date.now() * 2 : newDeltaPath.time
		};
	},

	async getSettings(clientSession, since) {
		since = Number(since);

		if (isNaN(since))
			throw new Error('since is not a number');

		const clientStorage = await Client.getStorage(clientSession);
		let settings = {};

		const times = (await clientStorage.list('delta')).filter((folder) => {
			return folder.length === 13 && Number(folder) > since;
		}).reverse();

		for (let i = times.length; i--;) {
			let settingsContent = await clientStorage.getContent(path.join('delta', times[i], 'sync.json'));

			settings[times[i]] = typeof settingsContent === 'string' ? JSON.parse(settingsContent) : settingsContent;

			if (settings[times[i]].isFullSettings)
				settings = {
					[times[i]]: settings[times[i]]
				};
		}

		return {
			settings,
			last: Number(times[times.length - 1])
		};
	}
};

exports.Client = Client;
