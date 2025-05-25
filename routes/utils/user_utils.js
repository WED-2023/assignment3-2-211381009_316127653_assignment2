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

/**
 * Adds a new private recipe for a user
 * 
 * @param {number} user_id - The ID of the user
 * @param {Object} recipe_details - Details of the recipe to add
 * @param {string} recipe_details.title - Title of the recipe
 * @param {number} recipe_details.readyInMinutes - Preparation time in minutes
 * @param {string} recipe_details.image - URL of the recipe image
 * @param {number} recipe_details.popularity - Popularity rating
 * @param {boolean} recipe_details.vegan - Whether the recipe is vegan
 * @param {boolean} recipe_details.vegetarian - Whether the recipe is vegetarian
 * @param {boolean} recipe_details.glutenFree - Whether the recipe is gluten-free
 * @param {Array} recipe_details.ingredients - List of ingredients
 * @param {string} recipe_details.instructions - Preparation instructions
 * @param {number} recipe_details.servings - Number of servings
 * @returns {Promise<number>} - A promise that resolves to the new recipe ID
 * @throws {Object} - Throws an error if required parameters are missing or if database operation fails
 */
async function addPrivateRecipe(user_id, recipe_details) {
    try {
        const { title, readyInMinutes, image, popularity, vegan, vegetarian, glutenFree, ingredients, instructions, servings } = recipe_details;
        
        // Validate required fields
        if (!title || !servings) {
            throw { status: 400, message: "Missing required parameters" };
        }
        
        // Store ingredients as JSON string
        const ingredientsJson = JSON.stringify(ingredients || []);
        const instructionsText = instructions || '';
        
        const result = await DButils.execQuery(
            `INSERT INTO private_recipes  (user_id, title, readyInMinutes, image_url, popularity, 
             vegan, vegetarian, gluten_free, ingredients, instructions, servings) 
             VALUES ('${user_id}', '${title}', '${readyInMinutes || 0}', '${image || ""}', '${popularity || 0}',
             '${vegan || 0}', '${vegetarian || 0}', '${glutenFree || 0}', 
             '${ingredientsJson}', '${instructionsText}', '${servings}')`
        );

        return result.insertId;
    } catch (error) {
        // If it's not our custom validation error
        if (!error.status) {
            console.log(`Error adding private recipe for user ${user_id}: ${error.message}`);
            throw { status: 500, message: "Failed to create private recipe", error: error };
        }
        throw error; // Re-throw validation errors
    }
}

/**
 * Retrieves all private recipes for a user
 * 
 * @param {number} user_id - The ID of the user
 * @returns {Promise<Array>} - A promise that resolves to an array of recipe objects
 * @throws {Object} - Throws an error object if the database operation fails
 */
async function getPrivateRecipes(user_id) {
    try {
        const recipes = await DButils.execQuery(
            `SELECT * FROM private_recipes  WHERE user_id='${user_id}'`
        );
        
        // Map SQL results to desired format
        return recipes.map(recipe => ({
            id: recipe.recipe_id,
            title: recipe.title,
            readyInMinutes: recipe.readyInMinutes,
            image: recipe.image_url,
            popularity: recipe.popularity,
            vegan: recipe.vegan === 1,
            vegetarian: recipe.vegetarian === 1,
            glutenFree: recipe.gluten_free === 1
        }));
    } catch (error) {
        console.log(`Error retrieving private recipes for user ${user_id}: ${error.message}`);
        throw { status: 500, message: "Failed to retrieve private recipes", error: error };
    }
}

/**
 * Retrieves detailed information about a specific private recipe
 * 
 * @param {number} recipe_id - The ID of the recipe to retrieve
 * @param {number} user_id - The ID of the user who owns the recipe
 * @returns {Promise<Object>} - A promise that resolves to the recipe details
 * @throws {Object} - Throws a 404 error if the recipe is not found, or a 500 error if the database operation fails
 */
async function getPrivateRecipeDetails(recipe_id, user_id) {
    try {
        const recipes = await DButils.execQuery(
            `SELECT * FROM private_recipes  WHERE recipe_id='${recipe_id}' AND user_id='${user_id}'`
        );
        
        // Check if recipe exists and belongs to the user
        if (recipes.length === 0) {
            throw { status: 404, message: "Private recipe not found" };
        }
        
        // Format the recipe data
        const recipe = recipes[0];
        return {
            id: recipe.recipe_id,
            title: recipe.title,
            readyInMinutes: recipe.readyInMinutes,
            image: recipe.image_url,
            popularity: recipe.popularity,
            vegan: recipe.vegan === 1,
            vegetarian: recipe.vegetarian === 1,
            glutenFree: recipe.gluten_free === 1,
            ingredients: JSON.parse(recipe.ingredients),
            instructions: recipe.instructions,
            servings: recipe.servings
        };
    } catch (error) {
        // If it's not our custom not found error
        if (!error.status) {
            console.log(`Error retrieving private recipe ${recipe_id} for user ${user_id}: ${error.message}`);
            throw { status: 500, message: "Failed to retrieve private recipe details", error: error };
        }
        throw error; // Re-throw not found error
    }
}

/**
 * Retrieves all family recipes for a specific user
 * 
 * @param {number} user_id - The ID of the user
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of family recipe objects
 * @throws {Object} - Throws an error object if there are fewer than 3 family recipes
 */
async function getAllFamilyRecipes(user_id) {
    const family_recipes = await DButils.execQuery(
        `SELECT * FROM family_recipes WHERE user_id=${user_id}`
    );
    
    if (family_recipes.length < 3) {
        throw { status: 204, message: "There are less than 3 family recipes" };
    }

    return family_recipes.map(recipe => ({
        id: recipe.recipe_id,
        title: recipe.recipe_name,
        image: recipe.image_url,
        owner: recipe.owner_name,
        when: recipe.when_to_prepare,
        ingredients: JSON.parse(recipe.ingredients),
        instructions: recipe.instructions
    }));
}

/**
 * Retrieves detailed information about a specific family recipe
 * 
 * @param {number} recipe_id - The ID of the family recipe
 * @param {number} user_id - The ID of the user who owns the recipe
 * @returns {Promise<Object>} - A promise that resolves to the family recipe details
 * @throws {Object} - Throws a 404 error if the recipe is not found or doesn't belong to the user
 */
async function getFamilyRecipeDetails(recipe_id, user_id) {
    const recipes = await DButils.execQuery(
        `SELECT * FROM family_recipes WHERE recipe_id=${recipe_id} AND user_id=${user_id}`
    );
    
    if (recipes.length === 0) {
        throw { status: 404, message: "Family recipe not found" };
    }

    const recipe = recipes[0];
    return {
        id: recipe.recipe_id,
        title: recipe.recipe_name,
        image: recipe.image_url,
        owner: recipe.owner_name,
        when: recipe.when_to_prepare,
        ingredients: JSON.parse(recipe.ingredients),
        instructions: recipe.instructions
    };
}

/**
 * Adds a new family recipe for a user
 * 
 * @param {number} user_id - The ID of the user
 * @param {Object} recipe_details - Details of the family recipe to add
 * @param {string} recipe_details.recipe_name - Name of the recipe
 * @param {string} recipe_details.owner_name - Name of the family member who created the recipe
 * @param {string} recipe_details.when_to_prepare - Description of when this recipe is traditionally prepared
 * @param {Array} recipe_details.ingredients - List of ingredients
 * @param {string} recipe_details.instructions - Preparation instructions
 * @param {string} recipe_details.image_url - URL of the recipe image (optional)
 * @returns {Promise<number>} - A promise that resolves to the new recipe ID
 * @throws {Object} - Throws an error if required parameters are missing or if database operation fails
 */
async function addFamilyRecipe(user_id, recipe_details) {
    try {
        const { recipe_name, owner_name, when_to_prepare, ingredients, instructions, image_url } = recipe_details;
        
        // Validate required fields
        if (!recipe_name || !owner_name || !instructions || !ingredients) {
            throw { status: 400, message: "Missing required parameters" };
        }
        
        // Store ingredients as JSON string
        const ingredientsJson = JSON.stringify(ingredients || []);
        
        const result = await DButils.execQuery(
            `INSERT INTO family_recipes (user_id, recipe_name, owner_name, when_to_prepare, ingredients, instructions, image_url) 
             VALUES ('${user_id}', '${recipe_name}', '${owner_name}', '${when_to_prepare || ""}', 
             '${ingredientsJson}', '${instructions}', '${image_url || ""}')`
        );

        return result.insertId;
    } catch (error) {
        // If it's not our custom validation error
        if (!error.status) {
            console.log(`Error adding family recipe for user ${user_id}: ${error.message}`);
            throw { status: 500, message: "Failed to create family recipe", error: error };
        }
        throw error; // Re-throw validation errors
    }
}

/**
 * Deletes a family recipe
 * 
 * @param {number} user_id - The ID of the user who owns the recipe
 * @param {number} recipe_id - The ID of the recipe to delete
 * @returns {Promise<boolean>} - A promise that resolves to true if the recipe was deleted
 * @throws {Object} - Throws an error if the recipe doesn't exist or doesn't belong to the user
 */
async function deleteFamilyRecipe(user_id, recipe_id) {
    try {
        // First check if the recipe exists and belongs to the user
        const recipe = await DButils.execQuery(
            `SELECT * FROM family_recipes WHERE recipe_id=${recipe_id} AND user_id=${user_id}`
        );
        
        if (recipe.length === 0) {
            throw { status: 404, message: "Family recipe not found or doesn't belong to you" };
        }
        
        // Delete the recipe
        await DButils.execQuery(
            `DELETE FROM family_recipes WHERE recipe_id=${recipe_id} AND user_id=${user_id}`
        );
        
        return true;
    } catch (error) {
        // If it's not our custom not found error
        if (!error.status) {
            console.log(`Error deleting family recipe ${recipe_id} for user ${user_id}: ${error.message}`);
            throw { status: 500, message: "Failed to delete family recipe", error: error };
        }
        throw error; // Re-throw not found error
    }
}

exports.markAsFavorite = markAsFavorite;
exports.getFavoriteRecipes = getFavoriteRecipes;
exports.removeFavorite = removeFavorite;
exports.markAsWatched = markAsWatched;
exports.getWatchedRecipes = getWatchedRecipes;
exports.getLastWatchedRecipes = getLastWatchedRecipes;
exports.deleteAllWatchedRecipes = deleteAllWatchedRecipes;
exports.addPrivateRecipe = addPrivateRecipe;
exports.getPrivateRecipes = getPrivateRecipes;
exports.getPrivateRecipeDetails = getPrivateRecipeDetails;
exports.getAllFamilyRecipes = getAllFamilyRecipes;
exports.getFamilyRecipeDetails = getFamilyRecipeDetails;
exports.addFamilyRecipe = addFamilyRecipe;
exports.deleteFamilyRecipe = deleteFamilyRecipe;
