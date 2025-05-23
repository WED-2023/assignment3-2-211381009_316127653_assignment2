const DButils = require("./DButils");

async function markAsFavorite(user_id, recipe_id){
    await DButils.execQuery(`insert into FavoriteRecipes values ('${user_id}',${recipe_id})`);
}

async function getFavoriteRecipes(user_id){
    const recipes_id = await DButils.execQuery(`select recipe_id from FavoriteRecipes where user_id='${user_id}'`);
    return recipes_id;
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
            `SELECT * FROM watchedrecipes WHERE user_id='${user_id}' AND recipe_id='${recipe_id}'`
        );

        if (existingWatch.length > 0) {
            // Update the timestamp if already watched
            await DButils.execQuery(
                `UPDATE watchedrecipes SET watched_at=CURRENT_TIMESTAMP WHERE user_id='${user_id}' AND recipe_id='${recipe_id}'`
            );
        } else {
            // Insert new watched record if not watched before
            await DButils.execQuery(
                `INSERT INTO watchedrecipes (user_id, recipe_id) VALUES ('${user_id}', '${recipe_id}')`
            );
        }
    } catch (error) {
        console.log(`Error marking recipe ${recipe_id} as watched for user ${user_id}: ${error.message}`);
        throw { status: 500, message: "Failed to mark recipe as watched", error: error };
    }


exports.markAsFavorite = markAsFavorite;
exports.getFavoriteRecipes = getFavoriteRecipes;
exports.markAsWatched = markAsWatched;
