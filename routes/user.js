/**
 * User Routes Module
 * 
 * This module handles all user-specific API endpoints, including:
 * - Favorite recipes management
 * - Watched recipes tracking
 * - Private recipes management
 * - User preferences and history
 * 
 * All routes in this module require authentication.
 */
var express = require("express");
var router = express.Router();
const DButils = require("./utils/DButils");
const user_utils = require("./utils/user_utils");
const recipe_utils = require("./utils/recipes_utils");
const { auth, validation } = require('../middleware');

/**
 * Apply authentication middleware to all routes in this router
 * 
 * This ensures all user-related endpoints are protected and can only
 * be accessed by authenticated users with valid sessions.
 */
router.use(auth.authenticate);

/**
 * Add a recipe to user's favorites list
 * 
 * @route POST /users/favorites
 * @authentication Required
 * @param {number} req.body.recipeId - ID of the recipe to add to favorites
 * @returns {Object} Success message
 * @returns {number} res.status - 200 on success, 400 if recipe doesn't exist
 * @throws {Error} If database operation fails
 */
router.post('/favorites', async (req,res,next) => {
  try{
    const user_id = req.session.user_id;
    const recipe_id = req.body.recipeId;
    await user_utils.markAsFavorite(user_id,recipe_id);
    res.status(200).send("The Recipe successfully saved as favorite");
    } catch(error){
    next(error);
  }
})

/**
 * This path returns the favorites recipes that were saved by the logged-in user
 */
router.get('/favorites', async (req,res,next) => {
  try{
    const user_id = req.session.user_id;
    let favorite_recipes = {};
    const recipes_id = await user_utils.getFavoriteRecipes(user_id);
    let recipes_id_array = [];
    recipes_id.map((element) => recipes_id_array.push(element.recipe_id)); //extracting the recipe ids into array
    const results = await recipe_utils.getRecipesPreview(recipes_id_array);
    res.status(200).send(results);
  } catch(error){
    next(error); 
  }
});

/**
 * Mark a recipe as watched by the user
 * 
 * If recipe was previously watched, this updates the timestamp.
 * 
 * @route POST /users/markwatched/:recipeId
 * @authentication Required
 * @param {string} req.params.recipeId - ID of the recipe to mark as watched
 * @returns {Object} Success message
 * @returns {number} res.status - 200 on success
 * @throws {Error} If database operation fails
 */
router.post('/markwatched/:recipeId', async (req, res, next) => {
  try {
    const user_id = req.session.user_id;
    const recipe_id = req.params.recipeId;
    
    await user_utils.markAsWatched(user_id, recipe_id);
    res.status(200).send({ message: "Recipe marked as watched", success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete all watched recipes history for the user
 * 
 * @route DELETE /users/deleteWatchedRecipes
 * @authentication Required
 * @returns {Object} Success message with count of deleted records
 * @returns {number} res.status - 200 on success
 * @throws {Error} If database operation fails
 */
router.delete('/deleteWatchedRecipes', async (req, res, next) => {
  try {
    const user_id = req.session.user_id;
    
    const deletedCount = await user_utils.deleteAllWatchedRecipes(user_id);
    res.status(200).send({ 
      message: "Watched recipes history cleared", 
      success: true,
      deletedCount: deletedCount
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get the last 3 recipes watched by the user
 * 
 * Returns recipes ordered by most recently watched first.
 * 
 * @route GET /users/lastWatchedRecipes
 * @authentication Required
 * @returns {Array<Object>} Array of recipe preview objects
 * @returns {number} res.status - 200 on success
 * @throws {Error} If database query fails
 */
router.get('/lastWatchedRecipes', async (req, res, next) => {
  try {
    const user_id = req.session.user_id;
    const recipes_id = await user_utils.getLastWatchedRecipes(user_id, 3);
    let recipes_id_array = [];
    recipes_id.map((element) => recipes_id_array.push(element.recipe_id));
    const results = await recipe_utils.getRecipesPreview(recipes_id_array);
    res.status(200).send(results);
  } catch (error) {
    next(error);
  }
});

/**
 * Get all recipes watched by the user
 * 
 * Returns recipes ordered by most recently watched first.
 * 
 * @route GET /users/allWatchedRecipes
 * @authentication Required
 * @returns {Array<Object>} Array of recipe preview objects
 * @returns {number} res.status - 200 on success
 * @throws {Error} If database query fails
 */
router.get('/allWatchedRecipes', async (req, res, next) => {
  try {
    const user_id = req.session.user_id;
    const recipes_id = await user_utils.getWatchedRecipes(user_id);
    let recipes_id_array = [];
    recipes_id.map((element) => recipes_id_array.push(element.recipe_id));
    const results = await recipe_utils.getRecipesPreview(recipes_id_array);
    res.status(200).send(results);
  } catch (error) {
    next(error);
  }
});

/**
 * Get the last search results from session
 * 
 * Returns the recipes from the most recent search operation
 * saved in the user's session.
 * 
 * @route GET /users/lastSearch
 * @authentication Required
 * @returns {Array<Object>} Array of recipe preview objects or empty array
 * @returns {number} res.status - 200 on success
 */
router.get('/lastSearch', async (req, res, next) => {
  try {
    const results = req.session.lastSearch || [];
    res.status(200).send(results);
  } catch (error) {
    next(error);
  }
});



module.exports = router;
