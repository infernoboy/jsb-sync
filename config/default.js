/*
* @Last modified in Sublime on Feb 04, 2017 03:42:55 PM
*/

'use strict';

module.exports = {
	development: {
		cookieSecret: 'ENTER A UNIQUE STRING',
		emailSalt: 'ENTER A UNIQUE STRING',
		port: 11160,
		workers: 1,
		redis: {
			disk: {
				port: 11140,
				db: {
					accounts: 0,
					keys: 1,
					session: 2,
					syncSession: 3
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
	}
};
