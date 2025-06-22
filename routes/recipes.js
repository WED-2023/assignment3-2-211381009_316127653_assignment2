/**
 * Recipe Routes Module
 *
 * This module handles all API endpoints related to recipes, including:
 * - Random recipe retrieval
 * - Recipe search
 * - Recipe details
 */
var express = require("express");
var router = express.Router();
const recipes_utils = require("./utils/recipes_utils");
const { validation, auth } = require("../middleware");

router.get("/", (req, res) => res.send("im here"));
/**
 * Get three random recipes
 *
 * @route GET /recipes/random
 * @returns {Array<Object>} Array of recipe preview objects
 * @returns {Array<Object>} Array of recipe preview objects
 * @returns {number} res.status - 200 on success
 * @throws {Error} If API request fails
 */
router.get("/random", async (req, res, next) => {
  try {
    const userId = req.session?.user_id;

    // Get basic random recipes first
    const basicRecipes = await recipes_utils.getRandomRecipes(3);

    // If user is logged in, enhance with like information
    if (userId) {
      const recipeIds = basicRecipes.map((recipe) => recipe.id);
      const enhancedRecipes = await recipes_utils.getRecipesPreviewWithLikes(
        recipeIds,
        userId
      );
      res.status(200).send(enhancedRecipes);
    } else {
      res.status(200).send(basicRecipes);
    }
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
 * @param {string} [req.query.sort] - Sort by 'time' or 'popularity'
 * @returns {Array<Object>} Matching recipe preview objects
 * @returns {number} res.status - 200 on success, 204 when no results found
 * @throws {Error} If validation fails or API request fails
 */
router.get(
  "/search",
  validation.validateRecipeSearch,
  async (req, res, next) => {
    try {
      const { query, number, cuisine, diet, intolerance, sort } = req.query;
      const userId = req.session?.user_id;

      const results = await recipes_utils.searchRecipes(
        query,
        number,
        cuisine,
        diet,
        intolerance,
        sort,
        userId
      );

      // Results already include like information from searchRecipes
      const enhancedResults = results;// Save search results to database for lastSearch
      if (req.session && req.session.user_id) {
        try {
          const user_utils = require("./utils/user_utils");
          await user_utils.saveSearchHistory(
            req.session.user_id,
            query,
            req.query, // Save all query parameters
            enhancedResults
          );
        } catch (saveError) {
          console.error("Error saving search history:", saveError);
          // Continue without failing the request
        }
      }

      if (enhancedResults.length === 0) {
        res
          .status(204)
          .send({ message: "No matching recipes found", success: true });
      } else {
        res.status(200).send(enhancedResults);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get full details of a recipe by its Spoonacular ID
 *
 * Includes combined likes count (Spoonacular + user likes) and user's like status.
 * If user is logged in, the recipe will be marked as watched.
 *
 * @route GET /recipes/:recipeId
 * @param {string} req.params.recipeId - Spoonacular ID of the recipe to retrieve
 * @returns {Object} Complete recipe details with like information
 * @returns {number} res.status - 200 on success
 * @throws {Error} If recipe not found or API request fails
 */
router.get("/:recipeId", async (req, res, next) => {
  try {
    const userId = req.session?.user_id;
    const recipe = await recipes_utils.getRecipeDetailsWithLikes(
      req.params.recipeId,
      userId
    );

    // Mark as watched if user is logged in, better to have a separate endpoint for this
    // Using this for debugging purposes, uncomment when needed
    // if (req.session && req.session.user_id) {
    //   await user_utils.markAsWatched(req.session.user_id, req.params.recipeId);
    // }

    res.status(200).send(recipe);
  } catch (error) {
    next(error);
  }
});

/**
 * Like or unlike a recipe
 *
 * @route POST /recipes/:recipeId/like
 * @param {string} req.params.recipeId - Spoonacular ID of the recipe
 * @param {boolean} req.body.like - True to like, false to unlike
 * @returns {Object} Success message and updated like count
 * @returns {number} res.status - 200 on success
 * @throws {Error} If user not authenticated or operation fails
 */
router.post("/:recipeId/like", auth.authenticate, async (req, res, next) => {
  try {
    const recipeId = req.params.recipeId;
    const { like } = req.body;
    const userId = req.session.user_id;

    if (typeof like !== "boolean") {
      return res
        .status(400)
        .send({ message: "Like parameter must be a boolean" });
    }

    const result = await recipes_utils.toggleRecipeLike(userId, recipeId, like);
    const totalLikes = await recipes_utils.getRecipeLikesCount(recipeId);

    res.status(200).send({
      ...result,
      totalLikes: totalLikes,
      userHasLiked: like,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
