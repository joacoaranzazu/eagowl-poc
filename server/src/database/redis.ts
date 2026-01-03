import Redis from 'ioredis';
import { config } from '@/shared/config';

declare global {
  var __redis: Redis | undefined;
}

const redis = globalThis.__redis || new Redis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

if (config.NODE_ENV === 'development') {
  globalThis.__redis = redis;
}

export async function connectRedis() {
  try {
    await redis.connect();
    console.log('✅ Redis connected successfully');
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    throw error;
  }
}

export async function disconnectRedis() {
  try {
    await redis.quit();
    console.log('✅ Redis disconnected');
  } catch (error) {
    console.error('❌ Redis disconnection failed:', error);
    throw error;
  }
}

// Redis utilities
export const redisCache = {
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await redis.setex(key, ttl, serializedValue);
    } else {
      await redis.set(key, serializedValue);
    }
  },

  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  },

  async del(key: string): Promise<number> {
    return redis.del(key);
  },

  async exists(key: string): Promise<boolean> {
    const result = await redis.exists(key);
    return result === 1;
  },

  async expire(key: string, ttl: number): Promise<boolean> {
    const result = await redis.expire(key, ttl);
    return result === 1;
  },

  // Pub/Sub utilities
  async publish(channel: string, message: any): Promise<number> {
    return redis.publish(channel, JSON.stringify(message));
  },

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    const subscriber = redis.duplicate();
    await subscriber.subscribe(channel);
    subscriber.on('message', (_, message) => {
      callback(JSON.parse(message));
    });
  },

  // Session management
  async setUserSession(userId: string, sessionData: any, ttl: number = 86400): Promise<void> {
    await this.set(`session:user:${userId}`, sessionData, ttl);
  },

  async getUserSession(userId: string): Promise<any> {
    return this.get(`session:user:${userId}`);
  },

  async removeUserSession(userId: string): Promise<void> {
    await this.del(`session:user:${userId}`);
  },

  // PTT session management
  async setPTTSession(sessionId: string, sessionData: any, ttl: number = 3600): Promise<void> {
    await this.set(`ptt:session:${sessionId}`, sessionData, ttl);
  },

  async getPTTSession(sessionId: string): Promise<any> {
    return this.get(`ptt:session:${sessionId}`);
  },

  async removePTTSession(sessionId: string): Promise<void> {
    await this.del(`ptt:session:${sessionId}`);
  },

  // Location tracking
  async setUserLocation(userId: string, location: any, ttl: number = 300): Promise<void> {
    await this.set(`location:user:${userId}`, location, ttl);
  },

  async getUserLocation(userId: string): Promise<any> {
    return this.get(`location:user:${userId}`);
  }
};

export { redis };
export default redis;