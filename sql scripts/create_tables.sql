-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS recipes_db;
USE recipes_db;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id INT NOT NULL AUTO_INCREMENT COMMENT 'User ID',
    username VARCHAR(45) NOT NULL COMMENT 'Username',
    firstname VARCHAR(45) DEFAULT NULL COMMENT 'First Name',
    lastname VARCHAR(45) DEFAULT NULL COMMENT 'Last Name',
    country VARCHAR(45) DEFAULT NULL COMMENT 'Country',
    password VARCHAR(100) DEFAULT NULL COMMENT 'Password',
    email VARCHAR(45) DEFAULT NULL COMMENT 'Email Address',
    profilePic VARCHAR(500) DEFAULT NULL COMMENT 'Profile Picture',
    PRIMARY KEY (user_id),
    UNIQUE KEY username_UNIQUE (username)
);

-- Create favorite_recipes table
CREATE TABLE IF NOT EXISTS favorite_recipes (
    user_id INT NOT NULL,
    recipe_id INT NOT NULL,
    PRIMARY KEY (user_id, recipe_id)
);

-- Create watched_recipes table
CREATE TABLE IF NOT EXISTS watched_recipes (
    user_id INT NOT NULL COMMENT 'User ID',
    recipe_id INT NOT NULL COMMENT 'Recipe ID',
    watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Watched Timestamp',
    PRIMARY KEY (user_id, recipe_id)
);

-- Create family_recipes table
CREATE TABLE IF NOT EXISTS family_recipes (
    recipe_id INT NOT NULL AUTO_INCREMENT COMMENT 'Recipe ID',
    user_id INT NOT NULL COMMENT 'User ID',
    recipe_name VARCHAR(100) NOT NULL COMMENT 'Recipe Name',
    owner_name VARCHAR(100) NOT NULL COMMENT 'Recipe Owner',
    when_to_prepare TEXT COMMENT 'When to Prepare',
    ingredients TEXT NOT NULL COMMENT 'Ingredients as JSON',
    instructions TEXT NOT NULL COMMENT 'Preparation Instructions',
    image_url VARCHAR(500) DEFAULT NULL COMMENT 'Recipe Image URL',
    PRIMARY KEY (recipe_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create private_recipes  table
CREATE TABLE IF NOT EXISTS private_recipes  (
    recipe_id INT NOT NULL AUTO_INCREMENT COMMENT 'Recipe ID',
    user_id INT NOT NULL COMMENT 'User ID',
    title VARCHAR(100) NOT NULL COMMENT 'Recipe Title',
    readyInMinutes INT DEFAULT 0 COMMENT 'Preparation Time',
    image_url VARCHAR(500) DEFAULT NULL COMMENT 'Recipe Image URL',
    popularity INT DEFAULT 0 COMMENT 'Popularity Rating',
    vegan BOOLEAN DEFAULT 0 COMMENT 'Is Vegan',
    vegetarian BOOLEAN DEFAULT 0 COMMENT 'Is Vegetarian',
    gluten_free BOOLEAN DEFAULT 0 COMMENT 'Is Gluten Free',
    ingredients TEXT COMMENT 'Ingredients as JSON',
    instructions TEXT COMMENT 'Preparation Instructions',
    servings INT NOT NULL COMMENT 'Number of Servings',
    PRIMARY KEY (recipe_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create recipe_likes table to track user likes on Spoonacular recipes
CREATE TABLE IF NOT EXISTS recipe_likes (
    recipe_id INT NOT NULL COMMENT 'Spoonacular Recipe ID',
    user_id INT NOT NULL COMMENT 'User ID who liked the recipe',
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When the like was added',
    PRIMARY KEY (recipe_id, user_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);


INSERT INTO users (username, firstname, lastname, country, password, email, profilePic)
VALUES 
('testuser', 'Test', 'User', 'Israel', '$2b$13$IHs1nKpj595BQTtR2Qs6rOi1TCOGvAB6fVrOIt.6tyiz2rbocA9L2', 'test@example.com', NULL); -- Password is "password"


INSERT INTO family_recipes (user_id, recipe_name, owner_name, when_to_prepare, ingredients, instructions, image_url)
VALUES 
(1, 'Cheesecake', 'Tova Katz', 'When having guests', 
 '[{"name":"Biscuits","amount":"14"},{"name":"Eggs","amount":"4"},{"name":"Sugar","amount":"1 cup"},{"name":"Cornflour","amount":"3 tablespoons"},{"name":"Instant vanilla pudding","amount":"3 tablespoons"},{"name":"Sweet cream","amount":"half box"},{"name":"White cheese 9%","amount":"half kilo"},{"name":"Sour cream","amount":"1 box"},{"name":"Lemon zest","amount":"1 lemon"}]', 
 'Crumble the biscuits and place in the bottom of the greased pan, mix all the other ingredients in the order of the ingredients above, and put in the oven at 170 degrees. Once it gets a little brown on top - take it out, take 2 cups of sour cream and mix with a bag of vanilla sugar, spread over the cake and put in the oven when it is turned off. Leave it in the oven for an hour when it is not working.',
 NULL),
 
(1, 'Cold salad of peppers and tomatoes', 'Tova Katz', 'Daily', 
 '[{"name":"Light green peppers","amount":"5"},{"name":"Tomatoes","amount":"5"},{"name":"Garlic cloves","amount":"3"},{"name":"Salt","amount":"to taste"},{"name":"Olive oil","amount":"1 tablespoon"}]', 
 'Cut the peppers into coarse pieces and put them on the pan with olive oil on it, wait for it to soften then add the chopped garlic, and add the diced tomatoes, salt, mix everything together and leave for another 20 minutes on low heat with a lid.',
 NULL),
 
(1, 'Cold zucchini salad', 'Tova Katz', 'Daily', 
 '[{"name":"Large zucchinis","amount":"3"},{"name":"Onions","amount":"3"},{"name":"Salt","amount":"to taste"},{"name":"Black pepper","amount":"to taste"}]', 
 'Scratch the zucchini on a grater, put in a pan with a drop of oil, and wait until it softens, and remove it to a bowl as soon as it softens. Chop the onions, put them in the pan until they are browned. Mix the zucchini with the onion in a bowl together, add salt and pepper. And before serving, you can grate a hard-boiled egg inside.',
 NULL);
