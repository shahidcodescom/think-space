import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;
let connecting: Promise<RedisClientType | null> | null = null;
let lastFailAt = 0;
const RETRY_MS = 15_000;

function redisUrl(): string | null {
  const url = process.env.REDIS_URL?.trim();
  return url || null;
}

/**
 * Return a connected Redis client, or null if REDIS_URL unset / Redis down.
 * Failures are cached briefly so request paths stay fast.
 */
export async function getRedis(): Promise<RedisClientType | null> {
  const url = redisUrl();
  if (!url) return null;

  if (client?.isOpen) return client;
  if (Date.now() - lastFailAt < RETRY_MS) return null;
  if (connecting) return connecting;

  connecting = (async () => {
    try {
      const c = createClient({
        url,
        socket: {
          connectTimeout: 1500,
          reconnectStrategy: false,
        },
      });
      c.on("error", () => {
        /* suppress noisy logs; callers treat null as offline */
      });
      await c.connect();
      client = c as RedisClientType;
      return client;
    } catch {
      lastFailAt = Date.now();
      client = null;
      return null;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

export async function pingRedis(): Promise<boolean> {
  const c = await getRedis();
  if (!c) return false;
  try {
    const pong = await c.ping();
    return pong === "PONG";
  } catch {
    lastFailAt = Date.now();
    try {
      await c.quit();
    } catch {
      /* ignore */
    }
    client = null;
    return false;
  }
}

export async function resetRedisClient(): Promise<void> {
  if (client) {
    try {
      await client.quit();
    } catch {
      /* ignore */
    }
  }
  client = null;
  connecting = null;
  lastFailAt = 0;
}
