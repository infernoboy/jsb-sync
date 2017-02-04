/*
* @Last modified in Sublime on Feb 04, 2017 11:17:45 AM
*/

'use strict';

const {app} = require('../../lib/app');
const should = require('should');
const request = require('supertest')(app.get('supertest'));

describe('Home Page', () => {
	it('returns the current time', (done) => {
		request
			.get('/time')
			.then((response) => {
				should(response).not.be.null();
				should(response.text).match(/^It is currently [0-9]{13} ms$/);

				done();
			});
	});
});

should;
