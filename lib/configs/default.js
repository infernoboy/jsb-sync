/*
* @Last modified in Sublime on Mar 06, 2017 06:54:25 PM
*/

'use strict';

module.exports = {
	development: {
		dataDir: '/development/data',
		cookieSecret: 'A Unique String',
		emailSalt: 'Another Unique String',
		testRegistrationVerificationKey: 'b4966aea-fba1-4933-ba7b-bae8919437cf',
		port: 11160,
		workers: 3,
		webSocketPath: '/jsb-sync-development/socket.io',
		webSocketOrigins: ['safari-extension://com.toggleable.javascriptblocker5-6s8j5hv3h4'],
		redis: {
			disk: {
				port: 11140,
				db: {
					accounts: 0,
					syncSession: 1,
					fileStore: 2,
					session: 3
				}
			},
			nodisk: {
				port: 11120,
				db: {
					newAccounts: 0,
					bruteAPI: 1,
					bruteWeb: 2
				}
			}
		}
	},

	production: {
		dataDir: '/production/data',
		cookieSecret: 'A Unique String',
		emailSalt: 'Another Unique String',
		port: 11260,
		workers: 3,
		webSocketPath: '/jsb-sync/socket.io',
		webSocketOrigins: ['safari-extension://com.toggleable.javascriptblocker5-6s8j5hv3h4'],
		redis: {
			disk: {
				port: 11240,
				db: {
					accounts: 0,
					syncSession: 1,
					fileStore: 2,
					session: 3
				}
			},
			nodisk: {
				port: 11220,
				db: {
					newAccounts: 0,
					bruteAPI: 1,
					bruteWeb: 2
				}
			}
		}
	}
};
