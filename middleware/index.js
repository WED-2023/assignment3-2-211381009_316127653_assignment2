const auth = require('./auth.middleware');
const validation = require('./validation.middleware');
const corsMiddleware = require('./cors.middleware');
const errorMiddleware = require('./error.middleware');

module.exports = {
  auth,
  validation,
  cors: corsMiddleware,
  error: errorMiddleware
};
