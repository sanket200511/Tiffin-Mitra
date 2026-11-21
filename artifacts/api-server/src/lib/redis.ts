import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL environment variable is required");
}

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  keepAlive: 30000,
  enableReadyCheck: true,
  retryStrategy(times) {
    // Reconnect with exponential backoff capped at 5 seconds
    return Math.min(times * 200, 5000);
  },
});

redis.on("connect", () => {
  console.log("Successfully connected to Redis");
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

export interface RedisKeepAliveResult {
  success: boolean;
  status: "connected" | "error";
  ping?: string;
  latencyMs: number;
  lastHeartbeat?: string | null;
  currentHeartbeat?: string;
  error?: string;
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

/**
 * Executes a keep-alive ping and updates the heartbeat key in Redis.
 * Performing both a PING and a write/read operation ensures cloud Redis providers
 * (e.g. Redis Cloud / RedisLabs, Upstash) register real activity and do not hibernate or pause the DB.
 */
export async function performRedisKeepAlive(timeoutMs = 5000): Promise<RedisKeepAliveResult> {
  const startTime = Date.now();
  try {
    const runPingAndWrite = async () => {
      const pingResponse = await redis.ping();
      const now = new Date().toISOString();

      // Read previous heartbeat timestamp
      const lastHeartbeat = await redis.get("keepalive:heartbeat");

      // Write current heartbeat timestamp with a 14-day TTL
      await redis.set("keepalive:heartbeat", now, "EX", 60 * 60 * 24 * 14);

      return { pingResponse, now, lastHeartbeat };
    };

    const { pingResponse, now, lastHeartbeat } = await withTimeout(
      runPingAndWrite(),
      timeoutMs,
      `Redis keep-alive timed out after ${timeoutMs}ms (Redis status: ${redis.status})`,
    );

    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      status: "connected",
      ping: pingResponse,
      latencyMs,
      lastHeartbeat,
      currentHeartbeat: now,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      status: "error",
      latencyMs,
      error: err?.message || String(err),
    };
  }
}

export default redis;
