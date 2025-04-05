import Redis from 'ioredis';
import { NextResponse } from 'next/server';

let redis: Redis | null = null;

// Initialize Redis client with connection handling
const getRedisClient = () => {
  if (redis === null) {
    try {
      redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          console.log(`Retrying Redis connection in ${delay}ms...`);
          return delay;
        },
        reconnectOnError(err) {
          console.error('Redis reconnect error:', err);
          return true;
        },
      });

      redis.on('error', (error) => {
        console.error('Redis connection error:', error);
        redis = null;
      });

      redis.on('connect', () => {
        console.log('Redis connected successfully');
      });

      redis.on('ready', () => {
        console.log('Redis ready for commands');
      });

      redis.on('reconnecting', () => {
        console.log('Redis reconnecting...');
      });

      // Test the connection
      redis.ping().catch((error) => {
        console.error('Redis ping failed:', error);
        redis = null;
      });
    } catch (error) {
      console.error('Redis initialization error:', error);
      redis = null;
    }
  }
  return redis;
};

// Cache duration in seconds (1 hour)
const CACHE_DURATION = 60 * 60;

// Cache key prefix
const CACHE_PREFIX = 'brmh:';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'Key is required' }, { status: 400 });
  }

  try {
    const client = getRedisClient();
    if (!client) {
      console.error('Redis client not available');
      // Fallback to no cache
      return NextResponse.json({ data: null });
    }

    // Test connection before proceeding
    await client.ping();
    
    const data = await client.get(`${CACHE_PREFIX}${key}`);
    console.log('Redis GET result for key:', key, 'Data found:', !!data);
    return NextResponse.json({ data: data ? JSON.parse(data) : null });
  } catch (error) {
    console.error('Cache get error:', error);
    // Fallback to no cache on error
    return NextResponse.json({ data: null });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 });
    }

    const client = getRedisClient();
    if (!client) {
      console.error('Redis client not available');
      // Fallback to success without caching
      return NextResponse.json({ success: true });
    }

    // Test connection before proceeding
    await client.ping();

    await client.setex(`${CACHE_PREFIX}${key}`, CACHE_DURATION, JSON.stringify(value));
    console.log('Redis SET success for key:', key);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cache set error:', error);
    // Fallback to success without caching
    return NextResponse.json({ success: true });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const prefix = searchParams.get('prefix');

  try {
    const client = getRedisClient();
    if (!client) {
      console.error('Redis client not available');
      return NextResponse.json({ success: true });
    }

    // Test connection before proceeding
    await client.ping();

    if (prefix) {
      const keys = await client.keys(`${CACHE_PREFIX}${prefix}*`);
      if (keys.length > 0) {
        await client.del(...keys);
        console.log('Redis DELETE success for prefix:', prefix, 'Keys deleted:', keys.length);
      }
    } else if (key) {
      await client.del(`${CACHE_PREFIX}${key}`);
      console.log('Redis DELETE success for key:', key);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cache delete error:', error);
    // Fallback to success
    return NextResponse.json({ success: true });
  }
} 