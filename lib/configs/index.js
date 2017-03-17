/*
* @Last modified in Sublime on Mar 17, 2017 05:55:16 AM
*/

'use strict';

module.exports = {
	development: {
		dataDir: '/Users/Travis/Sites/toggleable.com/sub/imac-jsb/private/jsb-sync-development-data',
		testRegistrationVerificationKey: 'b4966aea-fba1-4933-ba7b-bae8919437cf',
		port: 11160,
		listen: '0.0.0.0',
		workers: 3,
		webSocketPath: '/jsb-sync-development/socket.io',
		webSocketOrigins: ['safari-extension://com.toggleable.javascriptblocker5-6s8j5hv3h4'],
		redis: {
			disk: {
				host: 'redis-disk-master',
				port: 11140,
				db: {
					accounts: 0,
					syncSession: 1,
					session: 2
				}
			},
			nodisk: {
				host: 'redis-no-disk-master',
				port: 11120,
				db: {
					newAccounts: 0,
					bruteAPI: 1,
					bruteWeb: 2,
					passwordReset: 3
				}
			}
		}
	},
	production: {
		dataDir: '/home/nodejs/jsb-sync-data',
		port: 11260,
		listen: '0.0.0.0',
		workers: 3,
		webSocketPath: '/jsb-sync/socket.io',
		webSocketOrigins: ['safari-extension://com.toggleable.javascriptblocker5-6s8j5hv3h4'],
		redis: {
			disk: {
				host: 'redis-disk-master',
				port: 11240,
				db: {
					accounts: 0,
					syncSession: 1,
					session: 2
				}
			},
			nodisk: {
				host: 'redis-no-disk-master',
				port: 11220,
				db: {
					newAccounts: 0,
					bruteAPI: 1,
					bruteWeb: 2,
					passwordReset: 3
				}
			}
		}
	},
	'docker-production': {
		dataDir: '/home/nodejs/jsb-sync-data',
		port: 11260,
		listen: '0.0.0.0',
		workers: 3,
		webSocketPath: '/jsb-sync/socket.io',
		webSocketOrigins: ['safari-extension://com.toggleable.javascriptblocker5-6s8j5hv3h4'],
		redis: {
			disk: {
				host: 'redis-disk-master',
				port: 11240,
				db: {
					accounts: 0,
					syncSession: 1,
					session: 2
				}
			},
			nodisk: {
				host: 'redis-no-disk-master',
				port: 11220,
				db: {
					newAccounts: 0,
					bruteAPI: 1,
					bruteWeb: 2,
					passwordReset: 3
				}
			}
		}
	}
};
