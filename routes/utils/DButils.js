require("dotenv").config();
const MySql = require("./MySql");

/**
 * Executes a SQL query within a transaction
 * 
 * This function creates a database connection, starts a transaction,
 * executes the given SQL query, and handles transaction management
 * (commit/rollback) based on success or failure.
 *
 * @param {string} query - The SQL query to execute
 * @returns {Promise<Array>} - A promise that resolves to the query result
 * @throws {Error} - If the query execution fails
 */
exports.execQuery = async function (query) {
    let returnValue = []
    const connection = await MySql.connection();
    try {
    await connection.query("START TRANSACTION");
    returnValue = await connection.query(query);
  } catch (err) {
    await connection.query("ROLLBACK");
    console.log('ROLLBACK at querySignUp', err);
    throw err;
  } finally {
    await connection.release();
  }
  return returnValue
}

