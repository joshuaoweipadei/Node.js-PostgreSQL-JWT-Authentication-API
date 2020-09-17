var Pool = require('pg').Pool;
const config = require('../config.json');

var pool = new Pool(config.database_conn);

module.exports = pool;