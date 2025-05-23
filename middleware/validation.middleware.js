/**
 * Input Validation Middleware Module
 * 
 * This module provides middleware functions for validating user inputs
 * in various API requests to ensure data integrity and security.
 */

/**
 * Validates user registration input data
 * 
 * Checks for required fields, proper username format (3-8 letters),
 * password complexity (5-10 chars with at least one number and special character),
 * and valid email format.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Error response if validation fails, otherwise calls next()
 */
function validateRegister(req, res, next) {
  const { username, password, email } = req.body;
  
  // Basic validations
  if (!username || !password || !email) {
    return res.status(400).send({ message: "Missing required fields", success: false });
  }
  
  // Username validation (3-8 characters, letters only)
  if (!username.match(/^[a-zA-Z]{3,8}$/)) {
    return res.status(400).send({ 
      message: "Username must be 3-8 characters and contain only letters",
      success: false 
    });
  }
  
  // Password validation (5-10 chars, at least one number and special char)
  if (!password.match(/^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{5,10}$/)) {
    return res.status(400).send({ 
      message: "Password must be 5-10 characters with at least one number and special character",
      success: false 
    });
  }
  
  // Email validation
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).send({ 
      message: "Invalid email format",
      success: false 
    });
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
      success: false 
    });
  }
  
  // Validate number parameter if provided
  if (req.query.number) {
    const number = parseInt(req.query.number);
    if (![5, 10, 15].includes(number)) {
      return res.status(400).send({ 
        message: "Number parameter must be 5, 10, or 15", 
        success: false 
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
      success: false 
    });
  }
  
  next();
}

module.exports = {
  validateRegister,
  validateRecipeSearch,
  validatePrivateRecipe
};
