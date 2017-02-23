/*
* @Last modified in Sublime on Feb 23, 2017 12:22:27 PM
*/

'use strict';

const path = require('path');
const {getClientBySyncSessionID} = require('controllers/register');
const {FileStorage} = require('controllers/fileStorage');

const Client = {
	newDeltaPath() {
		const time = Date.now();

		return {
			time: time,
			path: `delta/${time}/sync.json`
		};
	},

	async getStorage(syncSessionID) {
		const client = await getClientBySyncSessionID(syncSessionID);

		if (!client)
			throw new Error('client not found');

		return new FileStorage(client.id);
	},

	async addBulk(syncSessionID, bulk) {
		JSON.parse(bulk);

		const clientStorage = await Client.getStorage(syncSessionID);
		const newDeltaPath = Client.newDeltaPath();

		await clientStorage.setContent(newDeltaPath.path, bulk);

		return newDeltaPath.time;
	},

	async replay(syncSessionID, since) {
		since = Number(since);

		if (isNaN(since))
			throw new Error('since is not a number');

		const clientStorage = await Client.getStorage(syncSessionID);
		const replays = {};

		const times = (await clientStorage.list('delta')).filter((folder) => {
			return folder.length === 13 && Number(folder) > since;
		});

		for (let i = times.length; i--;)
			replays[times[i]] = JSON.parse(await clientStorage.getContent(path.join('delta', times[i], 'sync.json')));

		return {
			last: times[times.length - 1],
			replays: replays
		};
	}
};

exports.Client = Client;
