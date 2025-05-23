/**
 * MySQL database connection module
 * 
 * This module provides utilities to create and manage MySQL database connections
 * using a connection pool for better performance and resource management.
 */
var mysql = require('mysql2');
require("dotenv").config();


/**
 * Database connection configuration
 * 
 * Reads connection parameters from environment variables
 */
const config={
connectionLimit:4,
  host: process.env.host,//"localhost"
  user: process.env.user,//"root"
  password: process.env.DBpassword,
  database:process.env.database
  // database:"mydb"
}

/**
 * MySQL connection pool instance
 */
const pool = new mysql.createPool(config);

/**
 * Creates a new database connection from the pool
 * 
 * @returns {Promise<Object>} - A promise that resolves to an object with query and release methods
 *                             for interacting with the database connection
 * @throws {Error} - If connection creation fails
 */
const connection =  () => {
  return new Promise((resolve, reject) => {
  pool.getConnection((err, connection) => {
    if (err) reject(err);
    console.log("MySQL pool connected: threadId " + connection.threadId);
    
    /**
     * Execute a SQL query on the connection
     * 
     * @param {string} sql - The SQL query to execute
     * @param {Array} binding - Query parameters for prepared statements
     * @returns {Promise<Object>} - A promise that resolves to the query result
     */
    const query = (sql, binding) => {
      return new Promise((resolve, reject) => {
         connection.query(sql, binding, (err, result) => {
           if (err) reject(err);
           resolve(result);
           });
         });
       };
      /**
      * Release the connection back to the pool
      * 
      * @returns {Promise<void>} - A promise that resolves when the connection is released
      */
       const release = () => {
         return new Promise((resolve, reject) => {
           if (err) reject(err);
           console.log("MySQL pool released: threadId " + connection.threadId);
           resolve(connection.release());
         });
       };
       resolve({ query, release });
     });
   });
 };
/**
 * Execute a SQL query directly on the pool
 * 
 * This is a convenience method for simple queries where a dedicated connection
 * is not needed. Use with caution for transaction management.
 * 
 * @param {string} sql - The SQL query to execute
 * @param {Array|Object} binding - Query parameters for prepared statements
 * @returns {Promise<Object>} - A promise that resolves to the query result
 * @throws {Error} - If query execution fails
 */
const query = (sql, binding) => {
  return new Promise((resolve, reject) => {
    pool.query(sql, binding, (err, result, fields) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

// Export MySQL utility functions
module.exports = { pool, connection, query };







