/**
 * Recipe Utilities Module
 *
 * This module provides functions to interact with the Spoonacular API for retrieving
 * recipe information and managing recipe data in the local database.
 */
const axios = require("axios");
const api_domain = "https://api.spoonacular.com/recipes";
const DButils = require("./DButils");
const cacheManager = require("./cache_manager");

// Rate limiting tracking
let requestCount = 0;
let lastRequestTime = Date.now();
let lastThrottleWarning = 0;
const MAX_REQUESTS_PER_MINUTE = 10; // Conservative limit to avoid hitting Spoonacular rate limits
const THROTTLE_WARNING_INTERVAL = 10000; // Only show throttle warning every 10 seconds

/**
 * Check if we should throttle API requests to avoid rate limits
 */
function shouldThrottleRequest() {
  const now = Date.now();
  const timeDiff = now - lastRequestTime;

  // Reset counter if more than a minute has passed
  if (timeDiff > 60000) {
    requestCount = 0;
    lastRequestTime = now;
  }

  if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
    // Only show warning every 10 seconds to reduce spam
    if (now - lastThrottleWarning > THROTTLE_WARNING_INTERVAL) {
      console.warn(
        `⚠️  Rate limiting: Made ${requestCount} requests in the last minute. Throttling API calls...`
      );
      lastThrottleWarning = now;
    }
    return true;
  }

  return false;
}

/**
 * Fetches detailed information about a recipe from the Spoonacular API
 *
 * @param {number} recipe_id - The Spoonacular ID of the recipe to fetch
 * @returns {Promise<Object>} - A promise that resolves to the Axios response containing recipe data
 * @throws {Error} - If the API request fails
 */
async function getRecipeInformation(recipe_id) {
  const endpoint = "recipe_information";
  const params = { recipe_id, includeNutrition: false };

  // Check advanced cache first
  const cachedData = await cacheManager.get(endpoint, params);
  if (cachedData) {
    return { data: cachedData };
  }

  // Check rate limiting
  if (shouldThrottleRequest()) {
    throw new Error(
      `RATE_LIMIT_THROTTLE: Too many requests, using throttling for recipe ${recipe_id}`
    );
  }

  try {
    console.log(`🌐 API call for recipe ${recipe_id} information`);
    requestCount++;
    const response = await axios.get(`${api_domain}/${recipe_id}/information`, {
      params: {
        includeNutrition: false,
        apiKey: process.env.spooncular_apiKey,
      },
    });

    // Store in advanced cache
    await cacheManager.set(endpoint, params, response.data);

    return response;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      // Rate limit exceeded - throw specific error
      throw new Error(`API_RATE_LIMIT_EXCEEDED: ${error.message}`);
    }
    throw error;
  }
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
  try {
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
  } catch (error) {
    console.error(`❌ Failed to fetch recipe ${recipe_id}:`, error.message);

    if (error.response && error.response.status === 402) {
      console.error(
        "🚫 Daily API limit reached (150 requests). Returning fallback recipe details."
      );
      return getFallbackRecipeDetails(recipe_id);
    } else if (error.response && error.response.status === 429) {
      console.error(
        "⚠️  API Rate limit exceeded. Returning fallback recipe details."
      );
      return getFallbackRecipeDetails(recipe_id);
    } else {
      console.error(
        "🔧 API error details:",
        error.response?.data || error.message
      );
      // Return fallback data for any other API error too
      console.error("Returning fallback recipe details due to API error.");
      return getFallbackRecipeDetails(recipe_id);
    }
  }
}

/**
 * Retrieves preview information for multiple recipes by their IDs
 *
 * This function fetches basic information for a list of recipes using batching
 * to avoid overwhelming the API with simultaneous requests.
 *
 * @param {Array<number>} recipes_ids_list - Array of recipe IDs to fetch preview data for
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of recipe preview objects
 *                                    Each preview contains id, title, readyInMinutes, image, and popularity
 */
async function getRecipesPreview(recipes_ids_list) {
  if (recipes_ids_list.length <= 5) {
    // For small lists, use the original method to avoid unnecessary delays
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
          // Handle rate limiting specifically
          if (
            error.message.includes("API_RATE_LIMIT_EXCEEDED") ||
            error.message.includes("RATE_LIMIT_THROTTLE")
          ) {
            console.log(
              `⚠️  API Rate limit or throttling for recipe ${recipe_id}. Using fallback data.`
            );
            return {
              id: recipe_id,
              title: "Recipe Details Unavailable (Rate Limited)",
              readyInMinutes: "N/A",
              image: `https://placehold.co/312x231?text=Recipe+${recipe_id}`,
              popularity: 0,
              vegan: false,
              vegetarian: false,
              glutenFree: false,
              apiLimitExceeded: true,
            };
          }

          console.log(`Failed to fetch recipe ${recipe_id}: ${error.message}`);
          // Return a placeholder with error information instead of null
          return {
            id: recipe_id,
            title: "Recipe information unavailable",
            readyInMinutes: 0,
            image: `https://placehold.co/312x231?text=Recipe+${recipe_id}`,
            popularity: 0,
            vegan: false,
            vegetarian: false,
            glutenFree: false,
            error: true,
          };
        }
      })
    );
    return recipes_info.filter((recipe) => !recipe.error);
  } else {
    // For larger lists, use batch processing
    console.log(
      `🔄 Processing ${recipes_ids_list.length} recipes in batches to avoid rate limits...`
    );
    return await processRecipesBatch(recipes_ids_list);
  }
}

/**
 * Fetches random recipes from the Spoonacular API
 *
 * @param {number} count - The number of random recipes to retrieve (default: 3)
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of recipe preview objects
 * @throws {Error} - If the API request fails
 */
async function getRandomRecipes(count = 3) {
  const endpoint = "random_recipes";
  const params = { number: count };

  try {
    console.log(`🌐 API call for ${count} random recipes`);
    const response = await axios.get(`${api_domain}/random`, {
      params: {
        number: count,
        apiKey: process.env.spooncular_apiKey,
      },
    });

    // Store raw data in cache
    await cacheManager.set(endpoint, params, response.data.recipes);

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
  } catch (error) {
    console.error(
      "❌ Error fetching random recipes from Spoonacular API:",
      error.message
    );
    if (error.response && error.response.status === 402) {
      console.error(
        "🚫 Daily API limit reached (150 requests). Returning fallback recipes."
      );
      // Return fallback mock data instead of throwing error
      return getFallbackRandomRecipes(count);
    } else if (error.response && error.response.status === 429) {
      console.error("⚠️  API Rate limit exceeded. Returning fallback recipes.");
      // Return fallback mock data instead of throwing error
      return getFallbackRandomRecipes(count);
    } else {
      console.error(
        "🔧 API error details:",
        error.response?.data || error.message
      );
      // Return fallback data for any other API error too
      console.error("Returning fallback recipes due to API error.");
      return getFallbackRandomRecipes(count);
    }
  }
}

/**
 * Provides fallback mock data when Spoonacular API is unavailable
 *
 * @param {number} count - Number of fallback recipes to return
 * @returns {Array<Object>} - Array of mock recipe objects
 */
function getFallbackRandomRecipes(count = 3) {
  const fallbackRecipes = [
    {
      id: "fallback_1",
      title: "Classic Spaghetti Carbonara (API Unavailable)",
      readyInMinutes: 30,
      image: "https://placehold.co/312x231?text=Spaghetti+Carbonara",
      popularity: 85,
      vegan: false,
      vegetarian: false,
      glutenFree: false,
      apiUnavailable: true,
    },
    {
      id: "fallback_2",
      title: "Chicken Caesar Salad (API Unavailable)",
      readyInMinutes: 15,
      image: "https://placehold.co/312x231?text=Caesar+Salad",
      popularity: 92,
      vegan: false,
      vegetarian: false,
      glutenFree: false,
      apiUnavailable: true,
    },
    {
      id: "fallback_3",
      title: "Vegetable Stir Fry (API Unavailable)",
      readyInMinutes: 20,
      image: "https://placehold.co/312x231?text=Vegetable+Stir+Fry",
      popularity: 78,
      vegan: true,
      vegetarian: true,
      glutenFree: true,
      apiUnavailable: true,
    },
    {
      id: "fallback_4",
      title: "Chocolate Chip Cookies (API Unavailable)",
      readyInMinutes: 45,
      image: "https://placehold.co/312x231?text=Chocolate+Cookies",
      popularity: 95,
      vegan: false,
      vegetarian: true,
      glutenFree: false,
      apiUnavailable: true,
    },
    {
      id: "fallback_5",
      title: "Grilled Salmon with Herbs (API Unavailable)",
      readyInMinutes: 25,
      image: "https://placehold.co/312x231?text=Grilled+Salmon",
      popularity: 88,
      vegan: false,
      vegetarian: false,
      glutenFree: true,
      apiUnavailable: true,
    },
  ];

  return fallbackRecipes.slice(0, count);
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
async function searchRecipes(
  query,
  number = 5,
  cuisine,
  diet,
  intolerance,
  sort,
  user_id = null
) {
  if (!query) {
    throw { status: 400, message: "Query parameter is missing" };
  }

  const endpoint = "search_recipes";
  const cacheParams = {
    query,
    number,
    cuisine: cuisine || null,
    diet: diet || null,
    intolerance: intolerance || null,
    sort: sort || null,
  };

  // Check cache first
  const cachedData = await cacheManager.get(endpoint, cacheParams);
  if (cachedData) {
    return cachedData;
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

  // Add sorting parameters
  if (sort) {
    if (sort === "time") {
      params.sort = "time";
      params.sortDirection = "asc"; // Shorter time is better
    } else if (sort === "popularity") {
      params.sort = "popularity";
      params.sortDirection = "desc"; // Higher popularity is better
    }
  }
  try {
    console.log(`🌐 API call for search: "${query}"`);
    const response = await axios.get(`${api_domain}/complexSearch`, { params });

    if (response.data.totalResults === 0) {
      const emptyResult = [];
      // Cache empty results too to avoid repeated API calls
      await cacheManager.set(endpoint, cacheParams, emptyResult);
      return emptyResult;
    }    const recipes = await getRecipesPreviewWithLikes(
      response.data.results.map((recipe) => recipe.id),
      user_id
    );

    // Store in cache
    await cacheManager.set(endpoint, cacheParams, recipes);

    return recipes;
  } catch (error) {
    console.error(
      `❌ Error searching recipes with query "${query}":`,
      error.message
    );

    if (error.response && error.response.status === 402) {
      console.error(
        "🚫 Daily API limit reached (150 requests). Search unavailable."
      );
      throw {
        status: 402,
        message:
          "The daily Spoonacular API request limit has been reached. Search is temporarily unavailable. Please try again later.",
      };
    } else if (error.response && error.response.status === 429) {
      console.error(
        "⚠️  API Rate limit exceeded. Too many requests in a short time."
      );
      throw {
        status: 429,
        message:
          "Too many requests to the Spoonacular API. Please wait a moment and try again.",
      };
    } else {
      console.error(
        "🔧 API error details:",
        error.response?.data || error.message
      );
      throw {
        status: error.response?.status || 500,
        message: "Failed to search recipes. Please try again later.",
      };
    }
  }
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

    // Get Spoonacular likes from API
    let spoonacularLikes = 0;
    try {
      const recipeInfo = await getRecipeInformation(recipe_id);
      spoonacularLikes = parseInt(recipeInfo.data.aggregateLikes) || 0;
    } catch (apiError) {
      // Silently use 0 if API fails (rate limit, daily limit, etc.)
      // This reduces log spam while still providing functionality
      spoonacularLikes = 0;
    }

    const totalLikes = spoonacularLikes + userLikes;
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
        // Handle rate limiting specifically
        if (
          error.message.includes("API_RATE_LIMIT_EXCEEDED") ||
          error.message.includes("RATE_LIMIT_THROTTLE")
        ) {
          console.log(
            `⚠️  API Rate limit or throttling for recipe ${recipe_id}. Using fallback data.`
          );
        } else {
          console.log(`Failed to fetch recipe ${recipe_id}: ${error.message}`);
        }

        // Still get the likes count even if recipe details fail
        const totalLikes = await getRecipeLikesCount(recipe_id);
        const userHasLiked = user_id
          ? await hasUserLikedRecipe(user_id, recipe_id)
          : false;

        return {
          id: recipe_id,
          title:
            error.message.includes("API_RATE_LIMIT_EXCEEDED") ||
            error.message.includes("RATE_LIMIT_THROTTLE")
              ? "Recipe Details Unavailable (Rate Limited)"
              : "Recipe information unavailable",
          readyInMinutes: "N/A",
          image: `https://placehold.co/312x231?text=Recipe+${recipe_id}`,
          popularity: totalLikes,
          vegan: false,
          vegetarian: false,
          glutenFree: false,
          userHasLiked: userHasLiked,
          apiLimitExceeded:
            error.message.includes("API_RATE_LIMIT_EXCEEDED") ||
            error.message.includes("RATE_LIMIT_THROTTLE"),
          error: true,
        };
      }
    })
  );

  // Don't filter out recipes with errors - they still have valid like counts
  // Only filter out if we have no recipes at all
  return recipes_info;
}

/**
 * Process recipes in batches to avoid overwhelming the API with simultaneous requests
 */
async function processRecipesBatch(recipe_ids, batchSize = 3, delayMs = 1000) {
  const results = [];

  for (let i = 0; i < recipe_ids.length; i += batchSize) {
    const batch = recipe_ids.slice(i, i + batchSize);
    console.log(
      `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
        recipe_ids.length / batchSize
      )}: recipes ${batch.join(", ")}`
    );

    // Process batch in parallel
    const batchPromises = batch.map(async (recipe_id) => {
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
        // Handle rate limiting specifically
        if (
          error.message.includes("API_RATE_LIMIT_EXCEEDED") ||
          error.message.includes("RATE_LIMIT_THROTTLE")
        ) {
          console.log(
            `⚠️  API Rate limit or throttling for recipe ${recipe_id}. Using fallback data.`
          );
          return {
            id: recipe_id,
            title: "Recipe Details Unavailable (Rate Limited)",
            readyInMinutes: "N/A",
            image: `https://placehold.co/312x231?text=Recipe+${recipe_id}`,
            popularity: 0,
            vegan: false,
            vegetarian: false,
            glutenFree: false,
            apiLimitExceeded: true,
          };
        }

        console.log(`Failed to fetch recipe ${recipe_id}: ${error.message}`);
        return {
          id: recipe_id,
          title: "Recipe information unavailable",
          readyInMinutes: 0,
          image: `https://placehold.co/312x231?text=Recipe+${recipe_id}`,
          popularity: 0,
          vegan: false,
          vegetarian: false,
          glutenFree: false,
          error: true,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Add delay between batches (except for the last batch)
    if (i + batchSize < recipe_ids.length) {
      console.log(`⏱️  Waiting ${delayMs}ms before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results.filter((recipe) => !recipe.error);
}

/**
 * Provides fallback recipe details when Spoonacular API is unavailable
 *
 * @param {string|number} recipe_id - The recipe ID
 * @returns {Object} - Mock recipe details object
 */
function getFallbackRecipeDetails(recipe_id) {
  return {
    id: recipe_id,
    title: `Recipe #${recipe_id} (API Unavailable)`,
    readyInMinutes: 30,
    image: `https://placehold.co/312x231?text=Recipe+${recipe_id}`,
    popularity: 0,
    vegan: false,
    vegetarian: false,
    glutenFree: false,
    ingredients: [
      {
        id: 1,
        original: "Ingredients not available (API limit reached)",
        name: "unavailable",
        amount: 0,
        unit: "",
      },
    ],
    instructions: [
      {
        number: 1,
        step: "Recipe instructions are not available due to API limitations. Please try again later when the API quota resets.",
      },
    ],
    servings: 1,
    apiUnavailable: true,
  };
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
exports.processRecipesBatch = processRecipesBatch;
