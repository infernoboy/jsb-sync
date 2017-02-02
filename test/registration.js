/*
* @Last modified in Sublime on Feb 02, 2017 06:54:39 AM
*/

'use strict';

const {app} = require('../lib/app');
const should = require('should');
const supertest = require('supertest');
const request = supertest(`http://localhost:${app.get('port')}`);

describe('Registration', () => {
	it('returns the string "hello"', (done) => {
		request
			.get('/')
			.expect(200, 'hello', done);
	});

	it('returns status code 404', (done) => {
		request
			.get('/missing')
			.expect(404, done);
	});
});

should;
