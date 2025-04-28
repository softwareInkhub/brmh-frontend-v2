import { Namespace, Account, Method, WebhookData, ExecutionLog } from '../types';

// Cache keys
const CACHE_KEYS = {
  NAMESPACES: 'brhm_namespaces',
  ACCOUNTS: 'brhm_accounts',
  METHODS: 'brhm_methods',
  WEBHOOKS: 'brhm_webhooks',
  EXECUTIONS: 'brhm_executions',
  CACHE_TIMESTAMP: 'brhm_cache_timestamp'
};

// Cache expiration time (24 hours in milliseconds)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

interface CacheData<T> {
  data: T;
  timestamp: number;
}

// Helper function to check if cache is expired
const isCacheExpired = (timestamp: number): boolean => {
  return Date.now() - timestamp > CACHE_EXPIRATION;
};

// Generic function to get data from cache
export const getFromCache = <T>(key: string): T | null => {
  try {
    const cachedData = localStorage.getItem(key);
    if (!cachedData) return null;

    const { data, timestamp } = JSON.parse(cachedData) as CacheData<T>;
    
    if (isCacheExpired(timestamp)) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error reading from cache for key ${key}:`, error);
    return null;
  }
};

// Generic function to save data to cache
export const saveToCache = <T>(key: string, data: T): void => {
  try {
    const cacheData: CacheData<T> = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error(`Error saving to cache for key ${key}:`, error);
  }
};

// Namespace cache functions
export const getNamespacesFromCache = (): Namespace[] | null => {
  return getFromCache<Namespace[]>(CACHE_KEYS.NAMESPACES);
};

export const saveNamespacesToCache = (namespaces: Namespace[]): void => {
  saveToCache(CACHE_KEYS.NAMESPACES, namespaces);
};

// Account cache functions
export const getAccountsFromCache = (namespaceId: string): Account[] | null => {
  return getFromCache<Account[]>(`${CACHE_KEYS.ACCOUNTS}_${namespaceId}`);
};

export const saveAccountsToCache = (namespaceId: string, accounts: Account[]): void => {
  saveToCache(`${CACHE_KEYS.ACCOUNTS}_${namespaceId}`, accounts);
};

// Method cache functions
export const getMethodsFromCache = (namespaceId: string): Method[] | null => {
  return getFromCache<Method[]>(`${CACHE_KEYS.METHODS}_${namespaceId}`);
};

export const saveMethodsToCache = (namespaceId: string, methods: Method[]): void => {
  saveToCache(`${CACHE_KEYS.METHODS}_${namespaceId}`, methods);
};

// Webhook cache functions
export const getWebhooksFromCache = (): WebhookData[] | null => {
  return getFromCache<WebhookData[]>(CACHE_KEYS.WEBHOOKS);
};

export const saveWebhooksToCache = (webhooks: WebhookData[]): void => {
  saveToCache(CACHE_KEYS.WEBHOOKS, webhooks);
};

// Execution cache functions
export const getExecutionsFromCache = (): ExecutionLog[] | null => {
  return getFromCache<ExecutionLog[]>(CACHE_KEYS.EXECUTIONS);
};

export const saveExecutionsToCache = (executions: ExecutionLog[]): void => {
  saveToCache(CACHE_KEYS.EXECUTIONS, executions);
};

// Clear all cache
export const clearAllCache = (): void => {
  Object.values(CACHE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

// Clear specific namespace cache
export const clearNamespaceCache = (namespaceId: string): void => {
  localStorage.removeItem(CACHE_KEYS.NAMESPACES);
  localStorage.removeItem(`${CACHE_KEYS.ACCOUNTS}_${namespaceId}`);
  localStorage.removeItem(`${CACHE_KEYS.METHODS}_${namespaceId}`);
};

// Clear webhook cache
export const clearWebhookCache = (): void => {
  localStorage.removeItem(CACHE_KEYS.WEBHOOKS);
};

// Clear execution cache
export const clearExecutionCache = (): void => {
  localStorage.removeItem(CACHE_KEYS.EXECUTIONS);
}; 