/**
 * Advanced Cache Manager for Spoonacular API
 *
 * This module provides multi-level caching:
 * 1. In-memory cache (fastest)
 * 2. Database cache (persistent)
 * 3. API fallback (slowest)
 */

const DButils = require("./DButils");

class CacheManager {
  constructor() {
    // In-memory cache for fastest access
    this.memoryCache = new Map();

    // Cache durations for different endpoints
    this.cacheDurations = {
      recipe_information: 24 * 60 * 60 * 1000, // 24 hours for recipe details
      random_recipes: 2 * 60 * 60 * 1000, // 2 hours for random recipes
      search_recipes: 4 * 60 * 60 * 1000, // 4 hours for search results
      recipe_nutrition: 7 * 24 * 60 * 60 * 1000, // 7 days for nutrition (rarely changes)
      default: 30 * 60 * 1000, // 30 minutes default
    };
  }

  /**
   * Generate cache key from endpoint and parameters
   */
  generateCacheKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});

    return `${endpoint}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Get cache duration for specific endpoint
   */
  getCacheDuration(endpoint) {
    return this.cacheDurations[endpoint] || this.cacheDurations.default;
  }

  /**
   * Check memory cache first (fastest)
   */
  getFromMemoryCache(cacheKey) {
    const cached = this.memoryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      console.log(`🚀 Memory cache HIT for ${cacheKey}`);
      return cached.data;
    }

    // Remove expired entry
    if (cached) {
      this.memoryCache.delete(cacheKey);
    }

    return null;
  }

  /**
   * Check database cache (persistent)
   */
  async getFromDatabaseCache(cacheKey) {
    try {
      const result = await DButils.execQuery(
        `SELECT response_data, expires_at FROM api_cache 
         WHERE cache_key = ? AND expires_at > NOW()`,
        [cacheKey]
      );

      if (result[0] && result[0].length > 0) {
        const cached = result[0][0];
        console.log(`💾 Database cache HIT for ${cacheKey}`);

        // Also store in memory cache for next time
        this.memoryCache.set(cacheKey, {
          data: cached.response_data,
          expiresAt: new Date(cached.expires_at).getTime(),
        });

        return cached.response_data;
      }
    } catch (error) {
      console.error("Database cache error:", error);
    }

    return null;
  }

  /**
   * Store data in both memory and database cache
   */
  async storeInCache(cacheKey, endpoint, data, params = {}) {
    const duration = this.getCacheDuration(endpoint);
    const expiresAt = new Date(Date.now() + duration);

    // Store in memory cache
    this.memoryCache.set(cacheKey, {
      data: data,
      expiresAt: expiresAt.getTime(),
    });

    // Store in database cache
    try {
      await DButils.execQuery(
        `INSERT INTO api_cache (cache_key, endpoint, response_data, expires_at, request_params) 
         VALUES (?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         response_data = VALUES(response_data), 
         expires_at = VALUES(expires_at), 
         request_params = VALUES(request_params)`,
        [
          cacheKey,
          endpoint,
          JSON.stringify(data),
          expiresAt,
          JSON.stringify(params),
        ]
      );

      console.log(
        `💾 Stored in cache: ${cacheKey} (expires: ${expiresAt.toISOString()})`
      );
    } catch (error) {
      console.error("Failed to store in database cache:", error);
    }
  }

  /**
   * Get cached data (checks memory first, then database)
   */
  async get(endpoint, params = {}) {
    const cacheKey = this.generateCacheKey(endpoint, params);

    // Try memory cache first
    let data = this.getFromMemoryCache(cacheKey);
    if (data) return data;

    // Try database cache
    data = await this.getFromDatabaseCache(cacheKey);
    if (data) return data;

    console.log(`❌ Cache MISS for ${cacheKey}`);
    return null;
  }

  /**
   * Store data in cache
   */
  async set(endpoint, params = {}, data) {
    const cacheKey = this.generateCacheKey(endpoint, params);
    await this.storeInCache(cacheKey, endpoint, data, params);
  }

  /**
   * Clear expired entries from database (cleanup)
   */
  async cleanupExpiredCache() {
    try {
      const result = await DButils.execQuery(
        `DELETE FROM api_cache WHERE expires_at < NOW()`
      );

      if (result[0].affectedRows > 0) {
        console.log(
          `🧹 Cleaned up ${result[0].affectedRows} expired cache entries`
        );
      }
    } catch (error) {
      console.error("Cache cleanup error:", error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const stats = await DButils.execQuery(`
        SELECT 
          endpoint,
          COUNT(*) as count,
          MIN(created_at) as oldest,
          MAX(expires_at) as newest_expiry
        FROM api_cache 
        WHERE expires_at > NOW()
        GROUP BY endpoint
      `);

      return {
        memoryCache: this.memoryCache.size,
        databaseCache: stats[0] || [],
      };
    } catch (error) {
      console.error("Error getting cache stats:", error);
      return { memoryCache: this.memoryCache.size, databaseCache: [] };
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clearAllCache() {
    this.memoryCache.clear();
    try {
      await DButils.execQuery(`DELETE FROM api_cache`);
      console.log("🗑️ All cache cleared");
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }
}

// Export singleton instance
module.exports = new CacheManager();
