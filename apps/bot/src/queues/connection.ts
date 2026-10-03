import Redis from "ioredis";
import { ConnectionOptions } from "bullmq";
import { logger } from "../utils/logger";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redisConnectionOptions: ConnectionOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  maxRetriesPerRequest: null,
};

// Singleton Redis Client for raw operations (hashes, counters, etc.)
export const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redisClient.on("connect", () => {
  logger.info("Connected to Redis server successfully");
});

redisClient.on("error", (err) => {
  logger.error({ err }, "Redis connection error");
});
