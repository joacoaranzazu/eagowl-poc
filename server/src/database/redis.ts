// Enhanced Redis client with proper error handling and caching
import Redis from 'ioredis';
import { config } from '../shared/config';

declare global {
  var __redis: Redis | undefined;
}

const redis = globalThis.__redis || new Redis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryDelayOnFailover: 100,
  commandTimeout: 5000,
  connectTimeout: 10000,
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

// Redis utilities con mejor manejo de errores y caching
export const redisCache = {
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await redis.setex(key, ttl, serializedValue);
      } else {
        await redis.set(key, serializedValue);
      }
    } catch (error) {
      console.error(`❌ Redis SET error for key ${key}:`, error);
      throw error;
    }
  },

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`❌ Redis GET error for key ${key}:`, error);
      return null;
    }
  },

  async del(key: string): Promise<number> {
    try {
      return await redis.del(key);
    } catch (error) {
      console.error(`❌ Redis DEL error for key ${key}:`, error);
      return 0;
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`❌ Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  },

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      console.error(`❌ Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  },

  // Pub/Sub utilities con mejor manejo de errores
  async publish(channel: string, message: any): Promise<number> {
    try {
      return redis.publish(channel, JSON.stringify(message));
    } catch (error) {
      console.error(`❌ Redis PUBLISH error for channel ${channel}:`, error);
      return 0;
    }
  },

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    try {
      const subscriber = redis.duplicate();
      await subscriber.subscribe(channel);
      subscriber.on('message', (_, message) => {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (parseError) {
          console.error(`❌ Redis message parse error:`, parseError);
        }
      });
    } catch (error) {
      console.error(`❌ Redis SUBSCRIBE error for channel ${channel}:`, error);
      throw error;
    }
  },

  // Session management con manejo robusto de errores
  async setUserSession(userId: string, sessionData: any, ttl: number = 86400): Promise<void> {
    try {
      await this.set(`session:user:${userId}`, sessionData, ttl);
    } catch (error) {
      console.error(`❌ Redis session set error for user ${userId}:`, error);
      throw error;
    }
  },

  async getUserSession(userId: string): Promise<any> {
    try {
      return this.get(`session:user:${userId}`);
    } catch (error) {
      console.error(`❌ Redis session get error for user ${userId}:`, error);
      return null;
    }
  },

  async removeUserSession(userId: string): Promise<void> {
    try {
      await this.del(`session:user:${userId}`);
    } catch (error) {
      console.error(`❌ Redis session delete error for user ${userId}:`, error);
      throw error;
    }
  },

  // PTT session management con manejo robusto de errores
  async setPTTSession(sessionId: string, sessionData: any, ttl: number = 3600): Promise<void> {
    try {
      await this.set(`ptt:session:${sessionId}`, sessionData, ttl);
    } catch (error) {
      console.error(`❌ Redis PTT session set error for session ${sessionId}:`, error);
      throw error;
    }
  },

  async getPTTSession(sessionId: string): Promise<any> {
    try {
      return this.get(`ptt:session:${sessionId}`);
    } catch (error) {
      console.error(`❌ Redis PTT session get error for session ${sessionId}:`, error);
      return null;
    }
  },

  async removePTTSession(sessionId: string): Promise<void> {
    try {
      await this.del(`ptt:session:${sessionId}`);
    } catch (error) {
      console.error(`❌ Redis PTT session delete error for session ${sessionId}:`, error);
      throw error;
    }
  },

  // Location tracking con manejo robusto de errores
  async setUserLocation(userId: string, location: any, ttl: number = 300): Promise<void> {
    try {
      await this.set(`location:user:${userId}`, location, ttl);
    } catch (error) {
      console.error(`❌ Redis location set error for user ${userId}:`, error);
      throw error;
    }
  },

  async getUserLocation(userId: string): Promise<any> {
    try {
      return this.get(`location:user:${userId}`);
    } catch (error) {
      console.error(`❌ Redis location get error for user ${userId}:`, error);
      return null;
    }
  }
};

export { redis };
export default redis;