/*
* @Last modified in Sublime on Feb 06, 2017 03:17:26 PM
*/

'use strict';

const {app} = require('app');
const should = require('should');
const request = require('supertest')(app.get('supertest'));

describe('Home Page', () => {
	it('returns the current time', (done) => {
		request
			.get('/web/time')
			.then((response) => {
				should(response).not.be.null();
				should(response.text).match(/^It is currently [0-9]{13} ms$/);

				done();
			});
	});
});

should;
