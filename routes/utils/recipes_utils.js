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
            apiKey: process.env.spooncular_apiKey
        }
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
    let { id, title, readyInMinutes, image, aggregateLikes, vegan, vegetarian, glutenFree, extendedIngredients, instructions, servings } = recipe_info.data;

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
        servings: servings
    }
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
                    glutenFree
                } = recipe.data;
                return {
                    id: id,
                    title: title,
                    readyInMinutes: readyInMinutes,
                    image: image,
                    popularity: aggregateLikes,
                    vegan: vegan,
                    vegetarian: vegetarian,
                    glutenFree: glutenFree
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
                    error: true
                };
            }
        })
    );
    // Filter out recipes with errors if needed or keep them with error flag
    return recipes_info.filter(recipe => !recipe.error);
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
            apiKey: process.env.spooncular_apiKey
        }
    });
    
    return response.data.recipes.map(recipe => ({
        id: recipe.id,
        title: recipe.title,
        readyInMinutes: recipe.readyInMinutes,
        image: recipe.image,
        popularity: recipe.aggregateLikes,
        vegan: recipe.vegan,
        vegetarian: recipe.vegetarian,
        glutenFree: recipe.glutenFree        
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
    
    const recipes = await getRecipesPreview(response.data.results.map(recipe => recipe.id));
    return recipes;
}




exports.getRecipeDetails = getRecipeDetails;
exports.getRecipesPreview = getRecipesPreview;
exports.getRandomRecipes = getRandomRecipes;
exports.searchRecipes = searchRecipes;



