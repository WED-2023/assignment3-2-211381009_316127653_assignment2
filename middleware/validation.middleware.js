/**
 * Input Validation Middleware Module
 *
 * This module provides middleware functions for validating user inputs
 * in various API requests to ensure data integrity and security.
 */

const axios = require("axios");

// Cache for countries to avoid repeated API calls
let countriesCache = null;
let cacheTimestamp = null;

/**
 * Gets a list of valid country names from the REST Countries API
 *
 * @returns {Promise<Array<string>>} Array of country common names
 */
async function getValidCountries() {
  // Use cache if available and less than 24 hours old
  if (
    countriesCache &&
    cacheTimestamp &&
    Date.now() - cacheTimestamp < 86400000
  ) {
    return countriesCache;
  }

  try {
    const response = await axios.get("https://restcountries.com/v3.1/all");
    // Extract country common names
    countriesCache = response.data.map((country) => country.name.common);
    cacheTimestamp = Date.now();
    return countriesCache;
  } catch (error) {
    console.error("Error fetching countries:", error.message);
    // Return empty array if API call fails
    return [];
  }
}

/**
 * Validates user registration input data
 *
 * Checks for required fields, proper username format (3-8 letters),
 * password complexity (5-10 chars with at least one number and special character),
 * valid email format, and valid country from REST Countries API.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Error response if validation fails, otherwise calls next()
 */
async function validateRegister(req, res, next) {
  const { username, password, email, country } = req.body;
  // Basic validations
  if (!username || !password || !email || !country) {
    return res
      .status(400)
      .send({ message: "Missing required fields", success: false });
  }

  // Username validation (3-8 characters, letters only)
  if (!username.match(/^[a-zA-Z]{3,8}$/)) {
    return res.status(400).send({
      message: "Username must be 3-8 characters and contain only letters",
      success: false,
    });
  }

  // Password validation (5-10 chars, at least one number and special char)
  if (
    !password.match(/^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{5,10}$/)
  ) {
    return res.status(400).send({
      message:
        "Password must be 5-10 characters with at least one number and special character",
      success: false,
    });
  }

  // Confirm password
  if (req.body.passwordConfirmation !== password) {
    return res.status(400).send({
      message: "Passwords do not match",
      success: false,
    });
  }

  // Email validation
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).send({
      message: "Invalid email format",
      success: false,
    });
  }

  // Country validation
  try {
    const validCountries = await getValidCountries();
    if (validCountries.length > 0 && !validCountries.includes(country)) {
      return res.status(400).send({
        message: "Invalid country. Please select a valid country from the list",
        success: false,
      });
    }
  } catch (error) {
    console.error("Country validation error:", error.message);
    // We can either fail or continue - here we choose to continue if the API call fails
  }

  next();
}

/**
 * Validates recipe search parameters
 *
 * Ensures that the required search query parameter is present and
 * that optional number parameter has valid values (5, 10, or 15).
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Error response if validation fails, otherwise calls next()
 */
function validateRecipeSearch(req, res, next) {
  // Check if query parameter exists
  if (!req.query.query) {
    return res.status(400).send({
      message: "Query parameter is missing",
      success: false,
    });
  }

  // Validate number parameter if provided
  if (req.query.number) {
    const number = parseInt(req.query.number);
    if (![5, 10, 15].includes(number)) {
      return res.status(400).send({
        message: "Number parameter must be 5, 10, or 15",
        success: false,
      });
    }
  }

  next();
}

/**
 * Validates private recipe creation parameters
 *
 * Ensures that the required fields (title and servings) are present
 * when creating or updating a private recipe.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Error response if validation fails, otherwise calls next()
 */
function validatePrivateRecipe(req, res, next) {
  const { title, servings } = req.body;

  // Check required fields
  if (!title || !servings) {
    return res.status(400).send({
      message: "Title and servings are required",
      success: false,
    });
  }

  next();
}

module.exports = {
  validateRegister,
  validateRecipeSearch,
  validatePrivateRecipe,
};
