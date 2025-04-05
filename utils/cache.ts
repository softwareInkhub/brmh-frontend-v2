// Cache key prefix for our application
const CACHE_PREFIX = 'brmh:';

// Cache duration in milliseconds (1 hour)
const CACHE_DURATION = 60 * 60 * 1000;

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export const cache = {
  // Get data from cache
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!item) return null;

      const { data, timestamp }: CacheItem<T> = JSON.parse(item);
      
      // Check if cache is expired
      if (Date.now() - timestamp > CACHE_DURATION) {
        this.del(key);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  // Set data in cache
  set<T>(key: string, value: T): void {
    try {
      const item: CacheItem<T> = {
        data: value,
        timestamp: Date.now()
      };
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(item));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  },

  // Delete data from cache
  del(key: string): void {
    try {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  },

  // Clear all cached data or data matching a prefix
  clear(prefix?: string): void {
    try {
      const keys = Object.keys(localStorage);
      const searchPrefix = prefix ? `${CACHE_PREFIX}${prefix}` : CACHE_PREFIX;
      
      keys.forEach(key => {
        if (key.startsWith(searchPrefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}; 