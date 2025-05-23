/**
 * Recipe Routes Module
 * 
 * This module handles all API endpoints related to recipes, including:
 * - Random recipe retrieval
 * - Recipe search
 * - Family recipes
 * - Recipe details
 */
var express = require("express");
var router = express.Router();
const recipes_utils = require("./utils/recipes_utils");
const user_utils = require("./utils/user_utils");
const { validation, auth } = require('../middleware');

router.get("/", (req, res) => res.send("im here"));
/**
 * Get three random recipes
 * 
 * @route GET /recipes/random
 * @returns {Array<Object>} Array of recipe preview objects 
 * @returns {number} res.status - 200 on success
 * @throws {Error} If API request fails
 */
router.get("/random", async (req, res, next) => {
  try {
    const recipes = await recipes_utils.getRandomRecipes(3);
    res.status(200).send(recipes);
  } catch (error) {
    next(error);
  }
});

/**
 * Search for recipes with various filtering parameters
 * 
 * @route GET /recipes/search
 * @param {string} req.query.query - The search term
 * @param {number} [req.query.number] - Number of results (5, 10, or 15)
 * @param {string} [req.query.cuisine] - Cuisine type filter
 * @param {string} [req.query.diet] - Diet restriction filter
 * @param {string} [req.query.intolerance] - Food intolerance filter
 * @returns {Array<Object>} Matching recipe preview objects
 * @returns {number} res.status - 200 on success, 204 when no results found
 * @throws {Error} If validation fails or API request fails
 */
router.get("/search", validation.validateRecipeSearch, async (req, res, next) => {
  try {
    const { query, number, cuisine, diet, intolerance } = req.query;
    
    const results = await recipes_utils.searchRecipes(query, number, cuisine, diet, intolerance);
    
    // Save search results in session for lastSearch
    if (req.session && req.session.user_id) {
      req.session.lastSearch = results;
    }
    
    if (results.length === 0) {
      res.status(204).send({ message: "No matching recipes found", success: true });
    } else {
      res.status(200).send(results);
    }
  } catch (error) {
    next(error);
  }
});

/**
 */
  try {
  } catch (error) {
    next(error);
  }
});

/**
 * Get full details of a recipe by its Spoonacular ID
 * 
 * If user is logged in, the recipe will be marked as watched.
 * 
 * @route GET /recipes/:recipeId
 * @param {string} req.params.recipeId - Spoonacular ID of the recipe to retrieve
 * @returns {Object} Complete recipe details
 * @returns {number} res.status - 200 on success
 * @throws {Error} If recipe not found or API request fails
 */
router.get("/:recipeId", async (req, res, next) => {
  try {
    const recipe = await recipes_utils.getRecipeDetails(req.params.recipeId);
    
    // Mark as watched if user is logged in
    if (req.session && req.session.user_id) {
      await user_utils.markAsWatched(req.session.user_id, req.params.recipeId);
    }

    res.status(200).send(recipe);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
