/*
* @Last modified in Sublime on Feb 06, 2017 03:17:02 PM
*/

'use strict';

const {app} = require('app');

app.use('/web', require('routes/web/urls'));
app.use('/api', require('routes/api/urls'));
