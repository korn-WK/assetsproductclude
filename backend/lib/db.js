const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const dbConfig = require('../config/database');

dotenv.config();

const pool = mysql.createPool(dbConfig);

module.exports = pool;