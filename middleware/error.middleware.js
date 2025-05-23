/**
 * Error handling middleware
 */

function errorHandler(err, req, res, next) {
  console.error("Error encountered:", err);
  
  // Set default error values
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  
  // Handle specific types of errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).send({
      message: "A resource with that identifier already exists",
      success: false
    });
  }
  
  // For Spoonacular API-related errors
  if (err.response && err.response.status) {
    let apiErrorMessage = "API Error";
    
    if (err.response.data && err.response.data.message) {
      apiErrorMessage = err.response.data.message;
    }
    
    return res.status(err.response.status).send({
      message: apiErrorMessage,
      success: false
    });
  }
  
  // Return formatted error response
  res.status(status).send({
    message: message,
    success: false
  });
}

module.exports = { errorHandler };
