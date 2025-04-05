import Redis from 'ioredis';
import { NextResponse } from 'next/server';

let redis: Redis | null = null;
let lastCheckTime = 0;
const CHECK_INTERVAL = 30000; // Only check every 30 seconds

const getRedisClient = () => {
  const now = Date.now();
  // If we checked recently and failed, don't try again
  if (!redis && (now - lastCheckTime) < CHECK_INTERVAL) {
    return null;
  }

  if (redis === null) {
    try {
      lastCheckTime = now;
      redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 0, // Don't retry
        connectTimeout: 1000,    // Short timeout
        retryStrategy: () => null, // Disable retries
        lazyConnect: true,       // Don't connect immediately
        enableOfflineQueue: false // Don't queue commands when offline
      });

      redis.on('error', (err) => {
        console.error('Redis connection error:', err);
        redis?.disconnect();
        redis = null;
      });
    } catch (err) {
      console.error('Failed to create Redis client:', err);
      redis = null;
    }
  }
  return redis;
};

export async function GET() {
  try {
    const client = getRedisClient();
    if (!client) {
      return NextResponse.json({ healthy: false });
    }

    // Try to connect only if needed
    if (!client.status || client.status === 'wait' || client.status === 'reconnecting') {
      await client.connect();
    }

    const pong = await Promise.race([
      client.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis ping timeout')), 1000))
    ]);
    return NextResponse.json({ healthy: pong === 'PONG' });
  } catch (err) {
    console.error('Redis health check failed:', err);
    if (redis) {
      redis.disconnect();
      redis = null;
    }
    return NextResponse.json({ healthy: false });
  }
} 