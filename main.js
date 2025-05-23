/**
 * Recipe Website API Server
 * 
 * This is the main entry point for the recipe website backend API.
 * 
 */

require("dotenv").config();
//#region express configures
var express = require("express");
var path = require("path");
var logger = require("morgan");
const session = require("client-sessions");
const DButils = require("./routes/utils/DButils");
const middleware = require('./middleware');

/**
 * Initialize Express application
 */
var app = express();
app.use(logger("dev")); //logger
app.use(express.json()); // parse application/json

/**
 * Apply CORS middleware to handle cross-origin requests
 * Allows requests from different origins to access the API
 */
app.use(middleware.cors);
app.options("*", middleware.cors);

/**
 * Configure session management with client-sessions
 * Manages user authentication state using encrypted cookies
 */
app.use(
  session({
    cookieName: "session", // the cookie key name
    //secret: process.env.COOKIE_SECRET, // the encryption key
    secret: "template", // the encryption key
    duration: 24 * 60 * 60 * 1000, // expired after 24 hours
    activeDuration: 1000 * 60 * 5, // if expiresIn < activeDuration,
    cookie: {
      httpOnly: false,
    }
    //the session will be extended by activeDuration milliseconds
  })
);
app.use(express.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(express.static(path.join(__dirname, "public"))); //To serve static files such as images, CSS files, and JavaScript files
//local:
app.use(express.static(path.join(__dirname, "dist")));
//remote:
// app.use(express.static(path.join(__dirname, '../assignment-3-3-frontend/dist')));

app.get("/",function(req,res)
{ 
  //remote: 
  // res.sendFile(path.join(__dirname, '../assignment-3-3-frontend/dist/index.html'));
  //local:
  res.sendFile(__dirname+"/index.html");

});

var port = process.env.PORT || "80"; //local=3000 remote=80
//#endregion
const user = require("./routes/user");
const recipes = require("./routes/recipes");
const auth = require("./routes/auth");


/**
 * Cookie authentication middleware
 * 
 * Verifies if the user is logged in by checking if the user_id in the session
 * corresponds to a valid user in the database. If valid, sets req.user_id for
 * downstream request handling.
 */
//#region cookie middleware
app.use(function (req, res, next) {
  if (req.session && req.session.user_id) {
    DButils.execQuery("SELECT user_id FROM users")
      .then((users) => {
        if (users.find((x) => x.user_id === req.session.user_id)) {
          req.user_id = req.session.user_id;
        }
        next();
      })
      .catch((error) => next());
  } else {
    next();
  }
});
//#endregion

// ----> For cheking that our server is alive
app.get("/alive", (req, res) => res.send("I'm alive"));

/**
 * Mount API routes
 * 
 * /users - User-specific operations (requires authentication)
 * /recipes - Recipe-related operations
 * / - Authentication operations (login, register, logout)
 */
app.use("/users", user);
app.use("/recipes", recipes);
app.use("/", auth);

/**
 * Global error handling middleware
 * Catches errors from routes and provides consistent error responses
 */
app.use(middleware.error.errorHandler);



/**
 * Start the server and listen for incoming connections
 */
const server = app.listen(port, () => {
  console.log(`Server listen on port ${port}`);
});

/**
 * Handle process termination gracefully
 * Closes the server and any open connections before exiting
 */
process.on("SIGINT", function () {
  if (server) {
    server.close(() => console.log("server closed"));
  }
  process.exit();
});
