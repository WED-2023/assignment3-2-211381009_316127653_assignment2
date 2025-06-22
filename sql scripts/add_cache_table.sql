-- Add cache table to store API responses
CREATE TABLE IF NOT EXISTS api_cache (
    cache_key VARCHAR(255) NOT NULL PRIMARY KEY COMMENT 'Unique cache key (endpoint + params)',
    endpoint VARCHAR(255) NOT NULL COMMENT 'API endpoint being cached',
    response_data JSON NOT NULL COMMENT 'Cached API response data',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When cache was created',
    expires_at TIMESTAMP NOT NULL COMMENT 'When cache expires',
    request_params JSON DEFAULT NULL COMMENT 'Request parameters for debugging'
) COMMENT = 'Cache table for Spoonacular API responses';

-- Index for faster lookups
CREATE INDEX idx_api_cache_endpoint ON api_cache(endpoint);
CREATE INDEX idx_api_cache_expires ON api_cache(expires_at);
