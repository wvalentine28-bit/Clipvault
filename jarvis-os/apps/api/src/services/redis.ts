import Redis from "ioredis";
import { config } from "../config";
import { logger } from "../index";

export const redisClient = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 10) return null;
    return Math.min(times * 100, 3000);
  },
});

redisClient.on("connect", () => logger.info("Redis connected"));
redisClient.on("error", (err) => logger.error({ err }, "Redis error"));
redisClient.on("reconnecting", () => logger.warn("Redis reconnecting"));

export const cacheClient = {
  async get<T>(key: string): Promise<T | null> {
    const data = await redisClient.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  },

  async set(
    key: string,
    value: unknown,
    ttlSeconds?: number
  ): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await redisClient.setex(key, ttlSeconds, serialized);
    } else {
      await redisClient.set(key, serialized);
    }
  },

  async delete(key: string): Promise<void> {
    await redisClient.del(key);
  },

  async deletePattern(pattern: string): Promise<void> {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  },

  async exists(key: string): Promise<boolean> {
    const count = await redisClient.exists(key);
    return count > 0;
  },

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    const value = await redisClient.incr(key);
    if (ttlSeconds && value === 1) {
      await redisClient.expire(key, ttlSeconds);
    }
    return value;
  },
};

export const pubSubClient = new Redis(config.REDIS_URL);
export const subClient = new Redis(config.REDIS_URL);

export function cacheKey(...parts: string[]): string {
  return parts.join(":");
}
