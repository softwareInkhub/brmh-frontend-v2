// Cache duration in seconds (1 hour)
const CACHE_DURATION = 60 * 60;

// Cache key prefix for our application
const CACHE_PREFIX = 'brmh:';

// Maximum size for a single cache entry (1MB)
const MAX_CACHE_SIZE = 1024 * 1024;

// Health check interval (30 seconds)
const HEALTH_CHECK_INTERVAL = 30000;

class CacheService {
  private lastHealthCheck = 0;
  private isRedisHealthy = false;

  private async checkRedisHealth(): Promise<boolean> {
    const now = Date.now();
    // Only check if enough time has passed since last check
    if (now - this.lastHealthCheck < HEALTH_CHECK_INTERVAL) {
      return this.isRedisHealthy;
    }

    try {
      this.lastHealthCheck = now;
      const response = await fetch('/api/cache/health');
      const { healthy } = await response.json();
      this.isRedisHealthy = healthy;
      return healthy;
    } catch (error) {
      this.isRedisHealthy = false;
      return false;
    }
  }

  private getLocalStorage<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!item) return null;

      const { data, timestamp } = JSON.parse(item);
      if (Date.now() - timestamp > CACHE_DURATION * 1000) {
        this.del(key);
        return null;
      }
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  private setLocalStorage<T>(key: string, value: T): void {
    try {
      const item = {
        data: JSON.stringify(value),
        timestamp: Date.now()
      };
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(item));
    } catch (error) {
      // Silently fail if localStorage is full
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis only if it was healthy recently
      if (await this.checkRedisHealth()) {
        try {
          const response = await fetch(`/api/cache?key=${encodeURIComponent(key)}`);
          if (response.ok) {
            const { data } = await response.json();
            if (data !== null) return data;
          }
        } catch {
          // Silently fall back to localStorage
        }
      }

      // Fallback to localStorage
      return this.getLocalStorage(key);
    } catch (error) {
      return this.getLocalStorage(key);
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    // Always try localStorage first as backup
    this.setLocalStorage(key, value);

    // Try Redis only if it was healthy recently
    if (await this.checkRedisHealth()) {
      try {
        await fetch('/api/cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        });
      } catch {
        // Silently continue if Redis fails
      }
    }
  }

  async del(key: string): Promise<void> {
    // Always clean localStorage
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);

    // Try Redis only if it was healthy recently
    if (await this.checkRedisHealth()) {
      try {
        await fetch(`/api/cache?key=${encodeURIComponent(key)}`, {
          method: 'DELETE',
        });
      } catch {
        // Silently continue if Redis fails
      }
    }
  }

  async clear(prefix?: string): Promise<void> {
    // Always clean localStorage
    const searchPrefix = prefix ? `${CACHE_PREFIX}${prefix}` : CACHE_PREFIX;
    Object.keys(localStorage)
      .filter(key => key.startsWith(searchPrefix))
      .forEach(key => localStorage.removeItem(key));

    // Try Redis only if it was healthy recently
    if (await this.checkRedisHealth()) {
      try {
        const params = prefix ? `?prefix=${encodeURIComponent(prefix)}` : '';
        await fetch(`/api/cache${params}`, {
          method: 'DELETE',
        });
      } catch {
        // Silently continue if Redis fails
      }
    }
  }
}

// Create a singleton instance
const cache = new CacheService();

export { cache as redisCache }; 