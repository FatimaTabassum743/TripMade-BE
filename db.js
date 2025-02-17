const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Fatima786@",
  database: "weatherapp",
});

module.exports = pool.promise();
