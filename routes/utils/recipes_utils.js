/**
 * Recipe Utilities Module
 *
 * This module provides functions to interact with the Spoonacular API for retrieving
 * recipe information and managing recipe data in the local database.
 */
const axios = require("axios");
const api_domain = "https://api.spoonacular.com/recipes";
const DButils = require("./DButils");

/**
 * Fetches detailed information about a recipe from the Spoonacular API
 *
 * @param {number} recipe_id - The Spoonacular ID of the recipe to fetch
 * @returns {Promise<Object>} - A promise that resolves to the Axios response containing recipe data
 * @throws {Error} - If the API request fails
 */
async function getRecipeInformation(recipe_id) {
  return await axios.get(`${api_domain}/${recipe_id}/information`, {
    params: {
      includeNutrition: false,
      apiKey: process.env.spooncular_apiKey,
    },
  });
}

/**
 * Retrieves and formats full recipe details from the Spoonacular API
 *
 * Extracts relevant fields from the API response and returns a standardized
 * recipe object format for use throughout the application.
 *
 * @param {number} recipe_id - The Spoonacular ID of the recipe to fetch
 * @returns {Promise<Object>} - A promise that resolves to an object containing formatted recipe details
 * @throws {Error} - If the API request fails or the response is invalid
 */
async function getRecipeDetails(recipe_id) {
  let recipe_info = await getRecipeInformation(recipe_id);
  let {
    id,
    title,
    readyInMinutes,
    image,
    aggregateLikes,
    vegan,
    vegetarian,
    glutenFree,
    extendedIngredients,
    instructions,
    servings,
  } = recipe_info.data;

  return {
    id: id,
    title: title,
    readyInMinutes: readyInMinutes,
    image: image,
    popularity: aggregateLikes,
    vegan: vegan,
    vegetarian: vegetarian,
    glutenFree: glutenFree,
    ingredients: extendedIngredients,
    instructions: instructions,
    servings: servings,
  };
}

/**
 * Retrieves preview information for multiple recipes by their IDs
 *
 * This function fetches basic information for a list of recipes in parallel,
 * handling any errors for individual recipes without failing the entire operation.
 *
 * @param {Array<number>} recipes_ids_list - Array of recipe IDs to fetch preview data for
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of recipe preview objects
 *                                    Each preview contains id, title, readyInMinutes, image, and popularity
 */
async function getRecipesPreview(recipes_ids_list) {
  let recipes_info = await Promise.all(
    recipes_ids_list.map(async (recipe_id) => {
      try {
        const recipe = await getRecipeInformation(recipe_id);
        const {
          id,
          title,
          readyInMinutes,
          image,
          aggregateLikes,
          vegan,
          vegetarian,
          glutenFree,
        } = recipe.data;
        return {
          id: id,
          title: title,
          readyInMinutes: readyInMinutes,
          image: image,
          popularity: aggregateLikes,
          vegan: vegan,
          vegetarian: vegetarian,
          glutenFree: glutenFree,
        };
      } catch (error) {
        console.log(`Failed to fetch recipe ${recipe_id}: ${error.message}`);
        // Return a placeholder with error information instead of null
        return {
          id: recipe_id,
          title: "Recipe information unavailable",
          readyInMinutes: 0,
          image: "",
          popularity: 0,
          error: true,
        };
      }
    })
  );
  // Filter out recipes with errors if needed or keep them with error flag
  return recipes_info.filter((recipe) => !recipe.error);
}

/**
 * Fetches random recipes from the Spoonacular API
 *
 * @param {number} count - The number of random recipes to retrieve (default: 3)
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of recipe preview objects
 * @throws {Error} - If the API request fails
 */
async function getRandomRecipes(count = 3) {
  const response = await axios.get(`${api_domain}/random`, {
    params: {
      number: count,
      apiKey: process.env.spooncular_apiKey,
    },
  });

  return response.data.recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    readyInMinutes: recipe.readyInMinutes,
    image: recipe.image,
    popularity: recipe.aggregateLikes,
    vegan: recipe.vegan,
    vegetarian: recipe.vegetarian,
    glutenFree: recipe.glutenFree,
  }));
}

/**
 * Searches for recipes using the Spoonacular API
 *
 * Performs a complex search with various filtering options and retrieves
 * preview information for the matching recipes.
 *
 * @param {string} query - The search query term
 * @param {number} number - Maximum number of results to retrieve (default: 5)
 * @param {string} cuisine - Optional cuisine type filter
 * @param {string} diet - Optional diet restriction filter
 * @param {string} intolerance - Optional food intolerance filter
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of recipe preview objects
 * @throws {Object} - Throws an error object with status and message if query is missing
 */
async function searchRecipes(query, number = 5, cuisine, diet, intolerance) {
  if (!query) {
    throw { status: 400, message: "Query parameter is missing" };
  }

  const params = {
    query: query,
    number: number,
    apiKey: process.env.spooncular_apiKey,
    instructionsRequired: true,
  };

  if (cuisine) params.cuisine = cuisine;
  if (diet) params.diet = diet;
  if (intolerance) params.intolerances = intolerance;

  const response = await axios.get(`${api_domain}/complexSearch`, { params });

  if (response.data.totalResults === 0) {
    return [];
  }

  const recipes = await getRecipesPreview(
    response.data.results.map((recipe) => recipe.id)
  );
  return recipes;
}

/**
 * Toggle a like for a recipe by a user (add if not liked, remove if already liked)
 *
 * @param {number} user_id - The ID of the user
 * @param {number} recipe_id - The Spoonacular ID of the recipe
 * @param {boolean} [like] - Optional: True to like, false to unlike. If not provided, toggles current state
 * @returns {Promise<Object>} - Result object with success status and message
 */
async function toggleRecipeLike(user_id, recipe_id, like) {
  try {
    // If like parameter is not provided, check current state and toggle
    if (like === undefined) {
      const currentlyLiked = await hasUserLikedRecipe(user_id, recipe_id);
      like = !currentlyLiked;
    }

    if (like) {
      // Add like (INSERT IGNORE to prevent duplicates)
      await DButils.execQuery(
        `INSERT IGNORE INTO recipe_likes (recipe_id, user_id) VALUES ('${recipe_id}', '${user_id}')`
      );
      return { success: true, message: "Recipe liked successfully" };
    } else {
      // Remove like
      await DButils.execQuery(
        `DELETE FROM recipe_likes WHERE recipe_id = '${recipe_id}' AND user_id = '${user_id}'`
      );
      return { success: true, message: "Recipe unliked successfully" };
    }
  } catch (error) {
    console.error("Error toggling recipe like:", error);
    throw error;
  }
}

/**
 * Get the total number of likes for a recipe (Spoonacular + user likes)
 *
 * @param {number} recipe_id - The Spoonacular ID of the recipe
 * @returns {Promise<number>} - Total number of likes
 */
async function getRecipeLikesCount(recipe_id) {
  try {
    // Get user likes count from database
    const userLikesResult = await DButils.execQuery(
      `SELECT COUNT(*) as userLikes FROM recipe_likes WHERE recipe_id = '${recipe_id}'`
    );

    // Handle MySQL2 result format correctly
    const userLikes = parseInt(userLikesResult[0][0].userLikes) || 0;
    console.log(`User likes for recipe ${recipe_id}:`, userLikes);

    // Get Spoonacular likes from API
    let spoonacularLikes = 0;
    try {
      const recipeInfo = await getRecipeInformation(recipe_id);
      spoonacularLikes = parseInt(recipeInfo.data.aggregateLikes) || 0;
      console.log(
        `Spoonacular likes for recipe ${recipe_id}:`,
        spoonacularLikes
      );
    } catch (apiError) {
      console.warn(
        `Failed to get Spoonacular likes for recipe ${recipe_id}:`,
        apiError.message
      );
      // Keep as 0 if API fails
    }

    const totalLikes = spoonacularLikes + userLikes;
    console.log(
      `Total likes for recipe ${recipe_id}:`,
      totalLikes,
      "(",
      userLikes,
      "user likes +",
      spoonacularLikes,
      "Spoonacular likes)"
    );
    return totalLikes;
  } catch (error) {
    console.error("Error getting recipe likes count:", error);
    return 0;
  }
}

/**
 * Check if a user has liked a specific recipe
 *
 * @param {number} user_id - The ID of the user
 * @param {number} recipe_id - The Spoonacular ID of the recipe
 * @returns {Promise<boolean>} - True if user has liked the recipe, false otherwise
 */
async function hasUserLikedRecipe(user_id, recipe_id) {
  try {
    const result = await DButils.execQuery(
      `SELECT COUNT(*) as liked FROM recipe_likes WHERE recipe_id = '${recipe_id}' AND user_id = '${user_id}'`
    );
    return result[0][0].liked > 0;
  } catch (error) {
    console.error("Error checking user like status:", error);
    return false;
  }
}

/**
 * Enhanced version of getRecipeDetails that includes like information
 *
 * @param {number} recipe_id - The Spoonacular ID of the recipe
 * @param {number} [user_id] - Optional user ID to check if user has liked the recipe
 * @returns {Promise<Object>} - Recipe details with like information
 */
async function getRecipeDetailsWithLikes(recipe_id, user_id = null) {
  try {
    const recipeDetails = await getRecipeDetails(recipe_id);
    const totalLikes = await getRecipeLikesCount(recipe_id);
    const userHasLiked = user_id
      ? await hasUserLikedRecipe(user_id, recipe_id)
      : false;

    return {
      ...recipeDetails,
      popularity: totalLikes, // Override with combined likes
      userHasLiked: userHasLiked,
    };
  } catch (error) {
    console.error("Error getting recipe details with likes:", error);
    throw error;
  }
}

/**
 * Enhanced version of getRecipesPreview that includes like information
 *
 * @param {Array<number>} recipes_ids_list - Array of recipe IDs
 * @param {number} [user_id] - Optional user ID to check likes
 * @returns {Promise<Array<Object>>} - Array of recipe previews with like information
 */
async function getRecipesPreviewWithLikes(recipes_ids_list, user_id = null) {
  let recipes_info = await Promise.all(
    recipes_ids_list.map(async (recipe_id) => {
      try {
        const recipe = await getRecipeInformation(recipe_id);
        const {
          id,
          title,
          readyInMinutes,
          image,
          vegan,
          vegetarian,
          glutenFree,
        } = recipe.data;

        const totalLikes = await getRecipeLikesCount(recipe_id);
        const userHasLiked = user_id
          ? await hasUserLikedRecipe(user_id, recipe_id)
          : false;

        return {
          id: id,
          title: title,
          readyInMinutes: readyInMinutes,
          image: image,
          popularity: totalLikes,
          vegan: vegan,
          vegetarian: vegetarian,
          glutenFree: glutenFree,
          userHasLiked: userHasLiked,
        };
      } catch (error) {
        console.log(`Failed to fetch recipe ${recipe_id}: ${error.message}`);
        return {
          id: recipe_id,
          title: "Recipe information unavailable",
          readyInMinutes: 0,
          image: "",
          popularity: 0,
          error: true,
        };
      }
    })
  );
  return recipes_info.filter((recipe) => !recipe.error);
}

exports.getRecipeDetails = getRecipeDetails;
exports.getRecipesPreview = getRecipesPreview;
exports.getRandomRecipes = getRandomRecipes;
exports.searchRecipes = searchRecipes;
exports.toggleRecipeLike = toggleRecipeLike;
exports.getRecipeLikesCount = getRecipeLikesCount;
exports.hasUserLikedRecipe = hasUserLikedRecipe;
exports.getRecipeDetailsWithLikes = getRecipeDetailsWithLikes;
exports.getRecipesPreviewWithLikes = getRecipesPreviewWithLikes;
