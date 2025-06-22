var path = require("path");
var express = require('express');
var app = require('./main');
var https = require('https');
var fs = require('fs');

// Comment out HTTPS options for local development
var httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, "privkey.pem")),//server.key
  cert: fs.readFileSync(path.join(__dirname, "fullchain.pem")),//server.cert
}

/**
 * Get port from environment and store in Express.
 */
var port = normalizePort(process.env.PORT || '443');

app.set('port', port);

/**
 * Create HTTP server.
 */
var server = https.createServer(httpsOptions, app);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }
  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;
  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
server.address("https://amit-and-yali-cooking-site.cs.bgu.ac.il");
function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
    console.log(`Server listen in port ${port} in adrress ${addr.address}`);
}

// Serve static files from the frontend dist directory
app.use(express.static(path.join(__dirname, '..', 'assignment3_3-frontend-main', 'dist')));

// Handle Vue.js router - serve index.html for any non-API routes
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/users') || req.path.startsWith('/recipes') || req.path.startsWith('/auth') || req.path.startsWith('/alive')) {
    return res.status(404).send('API route not found');
  }
  res.sendFile(path.join(__dirname, '..', 'assignment3_3-frontend-main', 'dist', 'index.html'));
});