/**
 * MySQL database connection module
 *
 * This module provides utilities to create and manage MySQL database connections
 * using a connection pool for better performance and resource management.
 */
const mysql = require("mysql2/promise");
require("dotenv").config();

/**
 * MySQL connection pool instance
 */
const pool = mysql.createPool({
  host: process.env.host,
  user: process.env.user,
  password: process.env.DBpassword,
  database: process.env.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = {
  /**
   * Creates a new database connection from the pool
   *
   * @returns {Promise<Object>} - A promise that resolves to an object with query and release methods
   *                             for interacting with the database connection
   * @throws {Error} - If connection creation fails
   */
  connection: () => pool.getConnection(),
};
