import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL environment variable is required");
}

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

redis.on("connect", () => {
  console.log("Successfully connected to Redis");
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

export default redis;
