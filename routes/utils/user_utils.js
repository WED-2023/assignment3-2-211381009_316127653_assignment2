const DButils = require("./DButils");

/**
 * Saves a recipe to a user's favorites list
 *
 * @param {number} user_id - The ID of the user
 * @param {number} recipe_id - The ID of the recipe to mark as favorite
 * @returns {Promise<void>} - A promise that resolves when the recipe is marked as favorite
 * @throws {Object} - Throws an error object if the database operation fails
 */
async function markAsFavorite(user_id, recipe_id) {
  try {
    await DButils.execQuery(
      `INSERT INTO favorite_recipes VALUES ('${user_id}',${recipe_id})`
    );
  } catch (error) {
    // Check if it's a duplicate entry error
    if (error.code === "ER_DUP_ENTRY") {
      throw {
        status: 409,
        message: "Recipe is already in favorites",
        error: error,
      };
    }
    console.log(
      `Error marking recipe ${recipe_id} as favorite for user ${user_id}: ${error.message}`
    );
    throw {
      status: 500,
      message: "Failed to save recipe as favorite",
      error: error,
    };
  }
}

/**
 * Retrieves all favorite recipes for a user
 *
 * @param {number} user_id - The ID of the user
 * @returns {Promise<Array>} - A promise that resolves to an array of recipe IDs
 * @throws {Object} - Throws an error object if the database operation fails
 */
async function getFavoriteRecipes(user_id) {
  try {
    const recipes_id = await DButils.execQuery(
      `SELECT recipe_id FROM favorite_recipes WHERE user_id='${user_id}'`
    );
    return recipes_id[0];
  } catch (error) {
    console.log(
      `Error retrieving favorite recipes for user ${user_id}: ${error.message}`
    );
    throw {
      status: 500,
      message: "Failed to retrieve favorite recipes",
      error: error,
    };
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
    const result = await DButils.execQuery(
      `DELETE FROM favorite_recipes WHERE user_id='${user_id}' AND recipe_id='${recipe_id}'`
    );
    // Check if any row was affected
    return result.affectedRows > 0;
  } catch (error) {
    console.log(
      `Error removing recipe ${recipe_id} from favorites for user ${user_id}: ${error.message}`
    );
    throw {
      status: 500,
      message: "Failed to remove recipe from favorites",
      error: error,
    };
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
    // Convert IDs to integers to ensure proper type handling
    user_id = parseInt(user_id);
    recipe_id = parseInt(recipe_id);

    // First check if the recipe is already watched by this user
    const [rows] = await DButils.execQuery(
      `SELECT 1 FROM watched_recipes WHERE user_id=${user_id} AND recipe_id=${recipe_id}`
    );

    if (rows && rows.length > 0) {
      // Update the timestamp if already watched
      await DButils.execQuery(
        `UPDATE watched_recipes SET watched_at=CURRENT_TIMESTAMP WHERE user_id=${user_id} AND recipe_id=${recipe_id}`
      );
    } else {
      // Insert new watched record if not watched before
      await DButils.execQuery(
        `INSERT INTO watched_recipes (user_id, recipe_id) VALUES (${user_id}, ${recipe_id})`
      );
    }
  } catch (error) {
    console.log(
      `Error marking recipe ${recipe_id} as watched for user ${user_id}: ${error.message}`
    );
    throw {
      status: 500,
      message: "Failed to mark recipe as watched",
      error: error,
    };
  }
}

/**
 * Retrieves all watched recipes for a user, ordered by most recently watched
 *
 * @param {number} user_id - The ID of the user
 * @returns {Promise<Array>} - A promise that resolves to an array of recipe IDs (e.g. [{ recipe_id: 123 }, ...])
 * @throws {Object} - Throws an error object if the database operation fails or if user_id is missing (401 Unauthorized)
 *
 * 200: Returns an array of objects, each with a recipe_id property, ordered by most recently watched.
 * 401: Returns an error if user_id is missing (Unauthorized).
 */
async function getWatchedRecipes(user_id) {
  if (!user_id) {
    throw {
      status: 401,
      message: "Unauthorized: user_id is required",
    };
  }
  try {
    const recipes_id = await DButils.execQuery(
      `SELECT recipe_id FROM watched_recipes WHERE user_id='${user_id}' ORDER BY watched_at DESC`
    );
    return recipes_id[0];
  } catch (error) {
    console.log(
      `Error retrieving watched recipes for user ${user_id}: ${error.message}`
    );
    throw {
      status: 500,
      message: "Failed to retrieve watched recipes",
      error: error,
    };
  }
}

/**
 * Retrieves the most recently watched recipes for a user, limited to a specified number
 *
 * @param {number} user_id - The ID of the user
 * @param {number} limit - Maximum number of recipes to return (default: 3)
 * @returns {Promise<Array>} - A promise that resolves to an array of recipe IDs (e.g. [{ recipe_id: 1 }, ...])
 * @throws {Object} - Throws an error object if the database operation fails or if user_id is missing (401 Unauthorized)
 *
 * 200: Returns an array of objects, each with a recipe_id property, ordered by most recently watched (up to the specified limit).
 * 401: Returns an error if user_id is missing (Unauthorized).
 */
async function getLastWatchedRecipes(user_id, limit = 3) {
  if (!user_id) {
    throw {
      status: 401,
      message: "Unauthorized: user_id is required",
    };
  }
  try {
    const recipes_id = await DButils.execQuery(
      `SELECT recipe_id FROM watched_recipes WHERE user_id='${user_id}' ORDER BY watched_at DESC LIMIT ${limit}`
    );
    return recipes_id[0];
  } catch (error) {
    console.log(
      `Error retrieving last watched recipes for user ${user_id}: ${error.message}`
    );
    throw {
      status: 500,
      message: "Failed to retrieve recently watched recipes",
      error: error,
    };
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
    const result = await DButils.execQuery(
      `DELETE FROM watched_recipes WHERE user_id='${user_id}'`
    );
    return result.affectedRows;
  } catch (error) {
    console.log(
      `Error deleting watched recipes for user ${user_id}: ${error.message}`
    );
    throw {
      status: 500,
      message: "Failed to delete watched recipes history",
      error: error,
    };
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
    const {
      title,
      readyInMinutes,
      image,
      popularity,
      vegan,
      vegetarian,
      glutenFree,
      ingredients,
      instructions,
      servings,
    } = recipe_details;

    // Validate required fields
    if (!title || !servings) {
      throw { status: 400, message: "Missing required parameters" };
    }

    // Store ingredients as JSON string
    const ingredientsJson = JSON.stringify(ingredients || []);
    const instructionsText = instructions || "";

    const result = await DButils.execQuery(
      `INSERT INTO private_recipes  (user_id, title, readyInMinutes, image_url, popularity, 
             vegan, vegetarian, gluten_free, ingredients, instructions, servings) 
             VALUES ('${user_id}', '${title}', '${readyInMinutes || 0}', '${
        image || ""
      }', '${popularity || 0}',
             '${vegan ? 1 : 0}', '${vegetarian ? 1 : 0}', '${
        glutenFree ? 1 : 0
      }', 
             '${ingredientsJson}', '${instructionsText}', '${servings}')`
    );

    return result.insertId;
  } catch (error) {
    // If it's not our custom validation error
    if (!error.status) {
      console.log(
        `Error adding private recipe for user ${user_id}: ${error.message}`
      );
      throw {
        status: 500,
        message: "Failed to create private recipe",
        error: error,
      };
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
    ); // Map SQL results to desired format
    return recipes[0].map((recipe) => ({
      recipe_id: recipe.recipe_id, // Use recipe_id to match frontend expectations
      id: recipe.recipe_id, // Keep id for compatibility
      title: recipe.title,
      readyInMinutes: recipe.readyInMinutes,
      image: recipe.image_url,
      popularity: recipe.popularity,
      vegan: recipe.vegan === 1,
      vegetarian: recipe.vegetarian === 1,
      glutenFree: recipe.gluten_free === 1,
      ingredients: recipe.ingredients ? JSON.parse(recipe.ingredients) : [],
      instructions: recipe.instructions,
      servings: recipe.servings,
    }));
  } catch (error) {
    console.log(
      `Error retrieving private recipes for user ${user_id}: ${error.message}`
    );
    throw {
      status: 500,
      message: "Failed to retrieve private recipes",
      error: error,
    };
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
    if (!user_id) {
      throw { status: 401, message: "Unauthorized" };
    }
    const recipes = await DButils.execQuery(
      `SELECT * FROM private_recipes  WHERE recipe_id='${recipe_id}' AND user_id='${user_id}'`
    );

    // Check if recipe exists and belongs to the user
    if (!recipes[0] || recipes[0].length === 0) {
      throw { status: 404, message: "Private recipe not found" };
    }

    // Format the recipe data
    const recipe = recipes[0][0];
    let ingredientsArr = [];
    try {
      ingredientsArr = recipe.ingredients ? JSON.parse(recipe.ingredients) : [];
    } catch (err) {
      throw { status: 404, message: "Private recipe not found" };
    }
    return {
      recipe_id: recipe.recipe_id, // Use recipe_id to match frontend expectations
      id: recipe.recipe_id,
      title: recipe.title,
      readyInMinutes: recipe.readyInMinutes,
      image: recipe.image_url,
      popularity: recipe.popularity,
      vegan: recipe.vegan === 1,
      vegetarian: recipe.vegetarian === 1,
      glutenFree: recipe.gluten_free === 1,
      ingredients: ingredientsArr,
      instructions: recipe.instructions,
      servings: recipe.servings,
    };
  } catch (error) {
    // If it's not our custom not found/unauthorized error
    if (!error.status) {
      console.log(
        `Error retrieving private recipe ${recipe_id} for user ${user_id}: ${error.message}`
      );
      throw {
        status: 500,
        message: "Failed to retrieve private recipe details",
        error: error,
      };
    }
    throw error; // Re-throw not found/unauthorized error
  }
}

/**
 * Retrieves all family recipes for a specific user
 *
 * @param {number} user_id - The ID of the user
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of family recipe objects
 * @throws {Object} - Throws an error object if there are fewer than 3 family recipes (204) or if user_id is missing (401 Unauthorized)
 *
 * 200: Returns an array of family recipe objects (at least 3).
 * 204: Returns if there are less than 3 family recipes.
 * 401: Returns an error if user_id is missing (Unauthorized).
 */
async function getAllFamilyRecipes(user_id) {
  if (!user_id) {
    throw { status: 401, message: "User not logged in" };
  }
  const family_recipes_result = await DButils.execQuery(
    `SELECT * FROM family_recipes WHERE user_id=${user_id}`
  );
  let family_recipes = Array.isArray(family_recipes_result[0])
    ? family_recipes_result[0]
    : family_recipes_result;

  console.log(
    `User ${user_id} has ${family_recipes.length} family recipes from database:`
  );
  family_recipes.forEach((recipe) => {
    console.log(
      `- Recipe: ${recipe.recipe_name}, Image: ${
        recipe.image_url || "No image"
      }`
    );
  });
  if (family_recipes.length < 3) {
    // If user has less than 3 family recipes, provide default ones
    console.log(
      `User ${user_id} has ${family_recipes.length} family recipes, providing defaults`
    );

    const defaultFamilyRecipes = [
      {
        recipe_id: `default_1_${user_id}`,
        recipe_name: "Cheesecake",
        owner_name: "Tova Katz",
        when_to_prepare: "When having guests",
        ingredients:
          '[{"name":"Biscuits","amount":"14"},{"name":"Eggs","amount":"4"},{"name":"Sugar","amount":"1 cup"},{"name":"Cornflour","amount":"3 tablespoons"},{"name":"Instant vanilla pudding","amount":"3 tablespoons"},{"name":"Sweet cream","amount":"half box"},{"name":"White cheese 9%","amount":"half kilo"},{"name":"Sour cream","amount":"1 box"},{"name":"Lemon zest","amount":"1 lemon"}]',
        instructions:
          "Crumble the biscuits and place in the bottom of the greased pan, mix all the other ingredients in the order of the ingredients above, and put in the oven at 170 degrees. Once it gets a little brown on top - take it out, take 2 cups of sour cream and mix with a bag of vanilla sugar, spread over the cake and put in the oven when it is turned off. Leave it in the oven for an hour when it is not working.",
        image_url: null,
      },
      {
        recipe_id: `default_2_${user_id}`,
        recipe_name: "Cold salad of peppers and tomatoes",
        owner_name: "Tova Katz",
        when_to_prepare: "Daily",
        ingredients:
          '[{"name":"Light green peppers","amount":"5"},{"name":"Tomatoes","amount":"5"},{"name":"Garlic cloves","amount":"3"},{"name":"Salt","amount":"to taste"},{"name":"Olive oil","amount":"1 tablespoon"}]',
        instructions:
          "Cut the peppers into coarse pieces and put them on the pan with olive oil on it, wait for it to soften then add the chopped garlic, and add the diced tomatoes, salt, mix everything together and leave for another 20 minutes on low heat with a lid.",
        image_url: "/family-images/Cold-salad-of-peppers-and-tomatoes.jpg",
      },
      {
        recipe_id: `default_3_${user_id}`,
        recipe_name: "Cold zucchini salad",
        owner_name: "Tova Katz",
        when_to_prepare: "Daily",
        ingredients:
          '[{"name":"Large zucchinis","amount":"3"},{"name":"Onions","amount":"3"},{"name":"Salt","amount":"to taste"},{"name":"Black pepper","amount":"to taste"}]',
        instructions:
          "Scratch the zucchini on a grater, put in a pan with a drop of oil, and wait until it softens, and remove it to a bowl as soon as it softens. Chop the onions, put them in the pan until they are browned. Mix the zucchini with the onion in a bowl together, add salt and pepper. And before serving, you can grate a hard-boiled egg inside.",
        image_url: null,
      },
    ];

    // Use default recipes if user has none, or combine with existing ones
    family_recipes =
      family_recipes.length === 0
        ? defaultFamilyRecipes
        : [
            ...family_recipes,
            ...defaultFamilyRecipes.slice(family_recipes.length),
          ];
  }

  const unique_recipes_map = new Map();
  family_recipes.forEach((recipe) => {
    // Debug logging
    console.log(
      "Processing recipe:",
      recipe.recipe_name,
      "Image URL:",
      recipe.image_url
    );

    // Use recipe_id as the unique key, assuming it's the primary key for the recipe
    if (!unique_recipes_map.has(recipe.recipe_id)) {
      unique_recipes_map.set(recipe.recipe_id, {
        // Ensure all fields from the page requirement are mapped
        recipe_id: recipe.recipe_id, // Keep for keying and potential detail views
        id: recipe.recipe_id, // For compatibility if 'id' is used elsewhere
        title: recipe.recipe_name, // Assign placeholder image if image_url is missing
        image:
          recipe.image_url ||
          `https://placehold.co/600x400?text=${encodeURIComponent(
            recipe.recipe_name
          )}`,
        owner: recipe.owner_name,
        whenToMake: recipe.when_to_prepare, // field name on page is whenToMake
        ingredients: recipe.ingredients ? JSON.parse(recipe.ingredients) : [], // Parse if string
        instructions: recipe.instructions,
        // Add readyInMinutes and servings if they exist in your family_recipes table
        // For now, providing defaults or N/A if not present
        readyInMinutes: recipe.readyInMinutes || "N/A", // Assuming this field might exist
        servings: recipe.servings || "N/A", // Assuming this field might exist
      });
    }
  });

  const processed_recipes = Array.from(unique_recipes_map.values());

  // Debug: Log the final processed recipes
  console.log(
    "Final processed recipes:",
    processed_recipes.map((r) => ({
      title: r.title,
      image: r.image,
    }))
  );

  // After deduplication, check if we still meet the "at least 3" requirement.
  // This check is based on the problem description that page should display AT LEAST 3.
  // If the database has fewer than 3 unique recipes for the user, this will throw.
  if (processed_recipes.length < 3) {
    throw {
      status: 204,
      message:
        "You need at least 3 unique family recipes to view this section.",
    };
  }

  return processed_recipes;
}

/**
 * Retrieves detailed information about a specific family recipe
 *
 * @param {number} recipe_id - The ID of the family recipe
 * @param {number} user_id - The ID of the user who owns the recipe
 * @returns {Promise<Object>} - A promise that resolves to the family recipe details
 * @throws {Object} - Throws a 404 error if the recipe is not found or doesn't belong to the user, or 401 if user_id is missing (Unauthorized)
 *
 * 200: Returns an object with all the family recipe details.
 * 401: Returns an error if user_id is missing (Unauthorized).
 * 404: Returns an error if the recipe is not found or doesn't belong to the user.
 */
async function getFamilyRecipeDetails(recipe_id, user_id) {
  if (!user_id) {
    throw { status: 401, message: "Unauthorized: user_id is required" };
  }

  // Check if this is a default recipe ID
  if (recipe_id.toString().startsWith(`default_`)) {
    console.log("Handling default recipe details for:", recipe_id);

    // Get the default recipes
    const defaultFamilyRecipes = [
      {
        recipe_id: `default_1_${user_id}`,
        recipe_name: "Cheesecake",
        owner_name: "Tova Katz",
        when_to_prepare: "When having guests",
        ingredients:
          '[{"name":"Biscuits","amount":"14"},{"name":"Eggs","amount":"4"},{"name":"Sugar","amount":"1 cup"},{"name":"Cornflour","amount":"3 tablespoons"},{"name":"Instant vanilla pudding","amount":"3 tablespoons"},{"name":"Sweet cream","amount":"half box"},{"name":"White cheese 9%","amount":"half kilo"},{"name":"Sour cream","amount":"1 box"},{"name":"Lemon zest","amount":"1 lemon"}]',
        instructions:
          "Crumble the biscuits and place in the bottom of the greased pan, mix all the other ingredients in the order of the ingredients above, and put in the oven at 170 degrees. Once it gets a little brown on top - take it out, take 2 cups of sour cream and mix with a bag of vanilla sugar, spread over the cake and put in the oven when it is turned off. Leave it in the oven for an hour when it is not working.",
        image_url: null,
      },
      {
        recipe_id: `default_2_${user_id}`,
        recipe_name: "Cold salad of peppers and tomatoes",
        owner_name: "Tova Katz",
        when_to_prepare: "Daily",
        ingredients:
          '[{"name":"Light green peppers","amount":"5"},{"name":"Tomatoes","amount":"5"},{"name":"Garlic cloves","amount":"3"},{"name":"Salt","amount":"to taste"},{"name":"Olive oil","amount":"1 tablespoon"}]',
        instructions:
          "Cut the peppers into coarse pieces and put them on the pan with olive oil on it, wait for it to soften then add the chopped garlic, and add the diced tomatoes, salt, mix everything together and leave for another 20 minutes on low heat with a lid.",
        image_url: "/family-images/Cold-salad-of-peppers-and-tomatoes.jpg",
      },
      {
        recipe_id: `default_3_${user_id}`,
        recipe_name: "Cold zucchini salad",
        owner_name: "Tova Katz",
        when_to_prepare: "Daily",
        ingredients:
          '[{"name":"Large zucchinis","amount":"3"},{"name":"Onions","amount":"3"},{"name":"Salt","amount":"to taste"},{"name":"Black pepper","amount":"to taste"}]',
        instructions:
          "Scratch the zucchini on a grater, put in a pan with a drop of oil, and wait until it softens, and remove it to a bowl as soon as it softens. Chop the onions, put them in the pan until they are browned. Mix the zucchini with the onion in a bowl together, add salt and pepper. And before serving, you can grate a hard-boiled egg inside.",
        image_url: null,
      },
    ];

    const recipe = defaultFamilyRecipes.find((r) => r.recipe_id === recipe_id);
    if (!recipe) {
      throw { status: 404, message: "Default family recipe not found" };
    }

    return {
      recipe_id: recipe.recipe_id,
      id: recipe.recipe_id,
      title: recipe.recipe_name,
      image:
        recipe.image_url ||
        `https://placehold.co/600x400?text=${encodeURIComponent(
          recipe.recipe_name
        )}`,
      owner: recipe.owner_name,
      whenToMake: recipe.when_to_prepare,
      ingredients: recipe.ingredients ? JSON.parse(recipe.ingredients) : [],
      instructions: recipe.instructions,
      readyInMinutes: "N/A",
      servings: "N/A",
    };
  }

  // Handle regular database recipes
  const recipes_result = await DButils.execQuery(
    `SELECT * FROM family_recipes WHERE recipe_id=${recipe_id} AND user_id=${user_id}`
  );

  const recipes = Array.isArray(recipes_result[0])
    ? recipes_result[0]
    : recipes_result;

  if (!recipes || recipes.length === 0) {
    throw { status: 404, message: "Family recipe not found" };
  }
  const recipe = recipes[0];
  return {
    recipe_id: recipe.recipe_id,
    id: recipe.recipe_id,
    title: recipe.recipe_name,
    image:
      recipe.image_url ||
      `https://placehold.co/600x400?text=${encodeURIComponent(
        recipe.recipe_name
      )}`,
    owner: recipe.owner_name,
    whenToMake: recipe.when_to_prepare,
    ingredients: recipe.ingredients ? JSON.parse(recipe.ingredients) : [],
    instructions: recipe.instructions,
    readyInMinutes: recipe.readyInMinutes || "N/A",
    servings: recipe.servings || "N/A",
  };
}

/**
 * Adds a new family recipe for a user
 *
 * @param {number} user_id - The ID of the user
 * @param {Object} recipe_details - Details of the recipe to add
 * @param {string} recipe_details.recipe_name - Name of the recipe
 * @param {string} recipe_details.owner_name - Name of the recipe owner
 * @param {string} recipe_details.when_to_prepare - When to prepare the recipe
 * @param {Array} recipe_details.ingredients - List of ingredients with amounts
 * @param {string} recipe_details.instructions - Preparation instructions
 * @param {string} recipe_details.image_url - Optional URL for recipe image
 * @returns {Promise<number>} - A promise that resolves to the new recipe ID
 * @throws {Object} - Throws an error if required parameters are missing or if database operation fails
 */
async function addFamilyRecipe(user_id, recipe_details) {
  try {
    const {
      recipe_name,
      owner_name,
      when_to_prepare,
      ingredients,
      instructions,
      image_url,
    } = recipe_details;

    // Validate required fields
    if (!recipe_name || !owner_name || !ingredients || !instructions) {
      throw { status: 400, message: "Missing required parameters" };
    }

    // Store ingredients as JSON string
    const ingredientsJson = JSON.stringify(ingredients);

    const result = await DButils.execQuery(
      `INSERT INTO family_recipes (user_id, recipe_name, owner_name, when_to_prepare, ingredients, instructions, image_url)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        recipe_name,
        owner_name,
        when_to_prepare,
        ingredientsJson,
        instructions,
        image_url || null,
      ]
    );

    return result.insertId;
  } catch (error) {
    console.log(
      `Error adding family recipe for user ${user_id}: ${error.message}`
    );
    throw {
      status: 500,
      message: "Failed to create family recipe",
      error: error,
    };
  }
}

/**
 * Saves a user's search history (last search)
 *
 * @param {number} user_id - The ID of the user
 * @param {string} search_query - The search query text
 * @param {Object} search_params - Search parameters (cuisine, diet, intolerance, sort, number)
 * @param {Array} search_results - Array of search results
 * @returns {Promise<void>} - A promise that resolves when the search history is saved
 * @throws {Object} - Throws an error object if the database operation fails
 */
async function saveSearchHistory(
  user_id,
  search_query,
  search_params,
  search_results
) {
  try {
    const params_json = JSON.stringify(search_params);
    const results_json = JSON.stringify(search_results);

    // Use REPLACE INTO to update existing record or insert new one
    await DButils.execQuery(
      `REPLACE INTO user_search_history (user_id, search_query, search_params, search_results) 
       VALUES (${user_id}, '${search_query.replace(
        /'/g,
        "''"
      )}', '${params_json.replace(/'/g, "''")}', '${results_json.replace(
        /'/g,
        "''"
      )}')`
    );
  } catch (error) {
    console.log(
      `Error saving search history for user ${user_id}: ${error.message}`
    );
    throw {
      status: 500,
      message: "Failed to save search history",
      error: error,
    };
  }
}

/**
 * Retrieves a user's last search history
 *
 * @param {number} user_id - The ID of the user
 * @returns {Promise<Object|null>} - A promise that resolves to the search history object or null if none found
 * @throws {Object} - Throws an error object if the database operation fails
 */
async function getSearchHistory(user_id) {
  try {
    const result = await DButils.execQuery(
      `SELECT search_query, search_params, search_results, searched_at 
       FROM user_search_history 
       WHERE user_id = ${user_id}`
    );

    if (result[0] && result[0].length > 0) {
      const history = result[0][0];
      return {
        search_query: history.search_query,
        search_params: JSON.parse(history.search_params),
        search_results: JSON.parse(history.search_results),
        searched_at: history.searched_at,
      };
    }

    return null;
  } catch (error) {
    console.log(
      `Error retrieving search history for user ${user_id}: ${error.message}`
    );
    throw {
      status: 500,
      message: "Failed to retrieve search history",
      error: error,
    };
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
exports.saveSearchHistory = saveSearchHistory;
exports.getSearchHistory = getSearchHistory;
exports.deletePrivateRecipe = deletePrivateRecipe;

/**
 * Deletes a family recipe created by the user
 *
 * @param {string | number} user_id - The ID of the user.
 * @param {string | number} recipe_id - The ID of the family recipe to delete.
 * @returns {Promise<boolean>} - True if successful, throws error otherwise.
 * @throws {Object} - An error object with status and message properties.
 */
async function deleteFamilyRecipe(user_id, recipe_id) {
  const parsedUserId = parseInt(user_id);
  const parsedRecipeId = parseInt(recipe_id);

  if (isNaN(parsedUserId) || isNaN(parsedRecipeId)) {
    console.error(
      `Invalid ID format for deletion: user_id='${user_id}', recipe_id='${recipe_id}'`
    );
    throw { status: 400, message: "Invalid user ID or recipe ID format." };
  }

  try {
    // First, check if the recipe exists and belongs to the user
    const recipes = await DButils.execQuery(
      `SELECT * FROM family_recipes WHERE recipe_id=${parsedRecipeId} AND user_id=${parsedUserId}`
    );

    // Assuming recipes[0] contains the array of rows.
    if (!recipes || !recipes[0] || recipes[0].length === 0) {
      throw {
        status: 404,
        message: "Family recipe not found or not owned by user.",
      };
    }

    // Delete the recipe
    await DButils.execQuery(
      `DELETE FROM family_recipes WHERE recipe_id=${parsedRecipeId} AND user_id=${parsedUserId}`
    );

    return true;
  } catch (error) {
    console.error(
      `Error deleting family recipe ${parsedRecipeId} for user ${parsedUserId}: ${error.message}`
    );
    if (error.status) {
      throw error;
    } else {
      throw {
        status: 500,
        message: "Failed to delete family recipe due to a server error.",
      };
    }
  }
}
exports.deleteFamilyRecipe = deleteFamilyRecipe;

/**
 * Deletes a private recipe created by the user
 *
 * @param {string | number} user_id - The ID of the user.
 * @param {string | number} recipe_id - The ID of the private recipe to delete.
 * @returns {Promise<boolean>} - True if successful, throws error otherwise.
 * @throws {Object} - An error object with status and message properties.
 */
async function deletePrivateRecipe(user_id, recipe_id) {
  const parsedUserId = parseInt(user_id);
  const parsedRecipeId = parseInt(recipe_id);

  if (isNaN(parsedUserId) || isNaN(parsedRecipeId)) {
    console.error(
      `Invalid ID format for deletion: user_id='${user_id}', recipe_id='${recipe_id}'`
    );
    throw { status: 400, message: "Invalid user ID or recipe ID format." };
  }

  try {
    // First, check if the recipe exists and belongs to the user
    // Ensure to use parsedRecipeId and parsedUserId in your SQL queries
    const recipes = await DButils.execQuery(
      `SELECT * FROM private_recipes WHERE recipe_id=${parsedRecipeId} AND user_id=${parsedUserId}`
    );

    // Check the structure of 'recipes' based on how DButils.execQuery returns data.
    // Assuming recipes[0] contains the array of rows.
    if (!recipes || !recipes[0] || recipes[0].length === 0) {
      throw { status: 404, message: "Recipe not found or not owned by user." };
    }

    // Delete the recipe
    await DButils.execQuery(
      `DELETE FROM private_recipes WHERE recipe_id=${parsedRecipeId} AND user_id=${parsedUserId}`
    );

    return true;
  } catch (error) {
    // Log with parsed IDs for consistency
    console.error(
      `Error deleting private recipe ${parsedRecipeId} for user ${parsedUserId}: ${error.message}`
    );
    // If the error already has a status (like our 400 or 404), re-throw it.
    // Otherwise, wrap it in a generic 500 error.
    if (error.status) {
      throw error;
    } else {
      // Provide a more specific message if possible, or keep it generic for security.
      throw {
        status: 500,
        message: "Failed to delete recipe due to a server error.",
      };
    }
  }
}
