const DButils = require("./DButils");

/**
 * Saves a recipe to a user's favorites list
 * 
 * @param {number} user_id - The ID of the user
 * @param {number} recipe_id - The ID of the recipe to mark as favorite
 * @returns {Promise<void>} - A promise that resolves when the recipe is marked as favorite
 * @throws {Object} - Throws an error object if the database operation fails
 */
async function markAsFavorite(user_id, recipe_id){
    try {
        await DButils.execQuery(`INSERT INTO favorite_recipes VALUES ('${user_id}',${recipe_id})`);
    } catch (error) {
        // Check if it's a duplicate entry error
        if (error.code === 'ER_DUP_ENTRY') {
            throw { status: 409, message: "Recipe is already in favorites", error: error };
        }
        console.log(`Error marking recipe ${recipe_id} as favorite for user ${user_id}: ${error.message}`);
        throw { status: 500, message: "Failed to save recipe as favorite", error: error };
    }
}

/**
 * Retrieves all favorite recipes for a user
 * 
 * @param {number} user_id - The ID of the user
 * @returns {Promise<Array>} - A promise that resolves to an array of recipe IDs
 * @throws {Object} - Throws an error object if the database operation fails
 */
async function getFavoriteRecipes(user_id){
    try {
        const recipes_id = await DButils.execQuery(`SELECT recipe_id FROM favorite_recipes WHERE user_id='${user_id}'`);
        return recipes_id;
    } catch (error) {
        console.log(`Error retrieving favorite recipes for user ${user_id}: ${error.message}`);
        throw { status: 500, message: "Failed to retrieve favorite recipes", error: error };
    }
}

/**
 * Removes a recipe from a user's favorites list
 * 
 * @param {number} user_id - The ID of the user
 * @param {number} recipe_id - The ID of the recipe to remove
 * @returns {Promise<boolean>} - A promise that resolves to true if a recipe was removed, false if it wasn't in favorites
 * @throws {Object} - Throws an error object if the database operation fails
 */
async function removeFavorite(user_id, recipe_id) {
    try {
        const result = await DButils.execQuery(`DELETE FROM favorite_recipes WHERE user_id='${user_id}' AND recipe_id='${recipe_id}'`);
        // Check if any row was affected
        return result.affectedRows > 0;
    } catch (error) {
        console.log(`Error removing recipe ${recipe_id} from favorites for user ${user_id}: ${error.message}`);
        throw { status: 500, message: "Failed to remove recipe from favorites", error: error };
    }
}

/**
 * Marks a recipe as watched by a user, updating the timestamp if already watched
 * 
 * @param {number} user_id - The ID of the user
 * @param {number} recipe_id - The ID of the recipe being watched
 * @returns {Promise<void>} - A promise that resolves when the recipe is marked as watched
 * @throws {Object} - Throws an error object if the database operation fails
 */
async function markAsWatched(user_id, recipe_id) {
    try {
        // First check if the recipe is already watched by this user
        const existingWatch = await DButils.execQuery(
            `SELECT * FROM watched_recipes WHERE user_id='${user_id}' AND recipe_id='${recipe_id}'`
        );

        if (existingWatch.length > 0) {
            // Update the timestamp if already watched
            await DButils.execQuery(
                `UPDATE watched_recipes SET watched_at=CURRENT_TIMESTAMP WHERE user_id='${user_id}' AND recipe_id='${recipe_id}'`
            );
        } else {
            // Insert new watched record if not watched before
            await DButils.execQuery(
                `INSERT INTO watched_recipes (user_id, recipe_id) VALUES ('${user_id}', '${recipe_id}')`
            );
        }
    } catch (error) {
        console.log(`Error marking recipe ${recipe_id} as watched for user ${user_id}: ${error.message}`);
        throw { status: 500, message: "Failed to mark recipe as watched", error: error };
    }
}

/**
 * Retrieves all watched recipes for a user, ordered by most recently watched
 * 
 * @param {number} user_id - The ID of the user
 * @returns {Promise<Array>} - A promise that resolves to an array of recipe IDs
 * @throws {Object} - Throws an error object if the database operation fails
 */
async function getWatchedRecipes(user_id) {
    try {
        const recipes_id = await DButils.execQuery(
            `SELECT recipe_id FROM watched_recipes WHERE user_id='${user_id}' ORDER BY watched_at DESC`
        );
        
        return recipes_id;
    } catch (error) {
        console.log(`Error retrieving watched recipes for user ${user_id}: ${error.message}`);
        throw { status: 500, message: "Failed to retrieve watched recipes", error: error };
    }
}

/**
 * Retrieves the most recently watched recipes for a user, limited to a specified number
 * 
 * @param {number} user_id - The ID of the user
 * @param {number} limit - Maximum number of recipes to return (default: 3)
 * @returns {Promise<Array>} - A promise that resolves to an array of recipe IDs
 * @throws {Object} - Throws an error object if the database operation fails
 */
async function getLastWatchedRecipes(user_id, limit = 3) {
    try {
        const recipes_id = await DButils.execQuery(
            `SELECT recipe_id FROM watched_recipes WHERE user_id='${user_id}' ORDER BY watched_at DESC LIMIT ${limit}`
        );
        
        return recipes_id;
    } catch (error) {
        console.log(`Error retrieving last watched recipes for user ${user_id}: ${error.message}`);
        throw { status: 500, message: "Failed to retrieve recently watched recipes", error: error };
    }
}

/**
 * Deletes all watched recipes for a user
 * 
 * @param {number} user_id - The ID of the user
 * @returns {Promise<number>} - A promise that resolves to the number of deleted records
 * @throws {Object} - Throws an error object if the database operation fails
 */
async function deleteAllWatchedRecipes(user_id) {
    try {
        const result = await DButils.execQuery(`DELETE FROM watched_recipes WHERE user_id='${user_id}'`);
        return result.affectedRows;
    } catch (error) {
        console.log(`Error deleting watched recipes for user ${user_id}: ${error.message}`);
        throw { status: 500, message: "Failed to delete watched recipes history", error: error };
    }
}

exports.markAsFavorite = markAsFavorite;
exports.getFavoriteRecipes = getFavoriteRecipes;
exports.removeFavorite = removeFavorite;
exports.markAsWatched = markAsWatched;
exports.getWatchedRecipes = getWatchedRecipes;
exports.getLastWatchedRecipes = getLastWatchedRecipes;
exports.deleteAllWatchedRecipes = deleteAllWatchedRecipes;
