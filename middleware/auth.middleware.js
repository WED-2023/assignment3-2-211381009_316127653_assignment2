const DButils = require("../routes/utils/DButils");

/**
 * Authentication middleware to verify if the user is logged in
 */
async function authenticate(req, res, next) {
  try {
    if (req.session && req.session.user_id) {
      const users = await DButils.execQuery("SELECT user_id FROM users");
      if (users.find((x) => x.user_id === req.session.user_id)) {
        req.user_id = req.session.user_id;
        next();
      } else {
        res.status(401).send({ message: "User not found", success: false });
      }
    } else {
      res.status(401).send({ message: "Unauthorized - User not logged in", success: false });
    }
  } catch (error) {
    next(error);
  }
}

module.exports = { authenticate };
