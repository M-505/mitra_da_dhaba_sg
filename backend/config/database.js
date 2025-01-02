// backend/config/database.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root', // your database username
  password: '123456', // your database password
  database: 'mitra_da_dhaba', // your database name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
pool.query('SELECT 1')
  .then(() => console.log('Database connected successfully'))
  .catch(err => console.error('Database connection error:', err));

module.exports = pool;