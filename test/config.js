/*
* @Last modified in Sublime on Feb 13, 2017 04:47:52 PM
*/

'use strict';

const config = require('configs/config');

module.exports = {
	INVALID_EMAIL: 'not',
	UNKNOWN_EMAIL: 'notmyemail@domain.com',
	EMAIL: 'myemail@domain.com',
	PASSWORD: 'mypassword',
	INVALID_PASSWORD: 'aaa',
	ACCOUNT_INVALID_PASSWORD: 'notmypassword',
	VERIFICATION_KEY: config.testRegistrationVerificationKey
};
