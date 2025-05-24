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

-- Sample data for quick testing
INSERT INTO users (username, firstname, lastname, country, password, email, profilePic)
VALUES 
('testuser', 'Test', 'User', 'Israel', '$2b$13$IHs1nKpj595BQTtR2Qs6rOi1TCOGvAB6fVrOIt.6tyiz2rbocA9L2', 'test@example.com', NULL); -- Password is "password"

-- Sample family recipes
INSERT INTO family_recipes (user_id, recipe_name, owner_name, when_to_prepare, ingredients, instructions, image_url)
VALUES 
(1, 'Grandma\'s Apple Pie', 'Grandma Sarah', 'During fall season and family gatherings', 
 '[{"name":"Apples","amount":"6"},{"name":"Sugar","amount":"1 cup"},{"name":"Flour","amount":"2 cups"},{"name":"Butter","amount":"200g"}]', 
 'Mix flour and butter to create dough. Cut apples and mix with sugar. Place in pie pan and bake for 45 minutes at 180°C.',
 'https://example.com/apple_pie.jpg'),
 
(1, 'Uncle\'s Famous Hummus', 'Uncle David', 'Any time, especially during summer', 
 '[{"name":"Chickpeas","amount":"2 cups"},{"name":"Tahini","amount":"1/2 cup"},{"name":"Lemon juice","amount":"1/4 cup"},{"name":"Garlic","amount":"3 cloves"}]', 
 'Blend chickpeas, tahini, lemon juice, and garlic until smooth. Add salt to taste.',
 'https://example.com/hummus.jpg'),
 
(1, 'Mom\'s Chicken Soup', 'Mom Rachel', 'During winter and when someone is sick', 
 '[{"name":"Chicken","amount":"1 whole"},{"name":"Carrots","amount":"3"},{"name":"Celery","amount":"2 stalks"},{"name":"Onion","amount":"1"}]', 
 'Put all ingredients in a large pot, cover with water. Bring to boil, then simmer for 3 hours. Strain and serve hot.',
 'https://example.com/chicken_soup.jpg');
