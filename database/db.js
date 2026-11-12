const mysql = require('mysql2/promise');

const dbName = process.env.DB_NAME || 'petcare';

const connectionSettings = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  // Cloud databases like TiDB Cloud only accept encrypted (TLS) connections.
  ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined
};

// A pool keeps a few connections open and reuses them, instead of opening
// a new connection for every request.
// dateStrings: DATE columns come back as 'YYYY-MM-DD' text instead of JS Date objects.
const pool = mysql.createPool({
  ...connectionSettings,
  database: dbName,
  dateStrings: true,
  connectionLimit: 10
});

// For INSERT / UPDATE / DELETE. Returns insertId and affectedRows.
async function run(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

// Returns the first matching row, or undefined.
async function get(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows[0];
}

// Returns all matching rows.
async function all(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function initDb() {
  // The database has to exist before the pool can use it, so this first
  // connection is made without choosing a database.
  const connection = await mysql.createConnection(connectionSettings);
  await connection.query('CREATE DATABASE IF NOT EXISTS `' + dbName + '`');
  await connection.end();

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(30) NOT NULL,
      email VARCHAR(254) NOT NULL UNIQUE,
      password VARCHAR(100) NOT NULL,
      role ENUM('user', 'admin') NOT NULL DEFAULT 'user'
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS pets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(50) NOT NULL,
      species VARCHAR(50),
      breed VARCHAR(50),
      age INT,
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      pet_id INT NOT NULL,
      date DATE NOT NULL,
      type VARCHAR(50) NOT NULL,
      notes TEXT,
      status ENUM('scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS medical_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      pet_id INT NOT NULL,
      record_type VARCHAR(50) NOT NULL,
      record_date DATE NOT NULL,
      details TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      pet_id INT NOT NULL,
      title VARCHAR(100) NOT NULL,
      due_date DATE NOT NULL,
      notes TEXT,
      is_done BOOLEAN NOT NULL DEFAULT FALSE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
    )
  `);
}

module.exports = { pool, run, get, all, initDb };
