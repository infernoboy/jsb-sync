/*
* @Last modified in Sublime on Feb 03, 2017 11:30:01 AM
*/

'use strict';

const {app} = require('./app');

app.use('/', require('./routes/web/urls'));
app.use('/api', require('./routes/api/urls'));
