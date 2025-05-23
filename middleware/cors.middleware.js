const cors = require('cors');

// CORS Configuration
const corsConfig = {
  origin: true,  // Allow requests from any origin
  methods: ["GET", "POST", "DELETE"],
  credentials: true,  // Allow cookies to be sent with requests
  maxAge: 86400  // Cache preflight response for 24 hours
};

// Export configured CORS middleware
module.exports = cors(corsConfig);
