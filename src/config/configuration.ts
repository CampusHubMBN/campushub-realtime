// =====================================================================
// src/config/configuration.ts
// =====================================================================

export interface RedisConnectionOptions {
  host:      string;
  port:      number;
  password?: string;
}

/**
 * Returns explicit ioredis connection options (host/port/password).
 * Avoids passing a URL string to ioredis because some versions fail to
 * send AUTH when a second options argument is also provided alongside the URL.
 *
 * Priority: REDIS_URL (Railway-injected, contains correct credentials) > manual env vars.
 */
export function getRedisOptions(): RedisConnectionOptions {
  const railwayUrl = process.env.REDIS_URL;

  if (railwayUrl) {
    try {
      const parsed = new URL(railwayUrl);
      const opts: RedisConnectionOptions = {
        host: parsed.hostname,
        port: parseInt(parsed.port || '6379', 10),
      };
      if (parsed.password) {
        opts.password = decodeURIComponent(parsed.password);
      }
      console.log(`[Redis] REDIS_URL parsed → ${opts.host}:${opts.port} password=${opts.password ? 'SET' : 'NOT SET'}`);
      return opts;
    } catch (e) {
      console.error('[Redis] Failed to parse REDIS_URL, falling back to manual vars', e);
    }
  }

  const host     = process.env.REDIS_HOST || 'localhost';
  const port     = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;
  console.log(`[Redis] Manual config → ${host}:${port} password=${password ? 'SET' : 'NOT SET'}`);
  return { host, port, password };
}

function parseRedis() {
  const host     = process.env.REDIS_HOST || 'localhost';
  const port     = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;
  return { host, port, password };
}

// REDIS_URL path (SPA / Render style) — kept for reference
// function parseRedis() {
//   const url = process.env.REDIS_URL;
//   if (url) {
//     const parsed = new URL(url);
//     return { host: parsed.hostname, port: parseInt(parsed.port || '6379', 10), password: parsed.password || undefined };
//   }
//   return { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379', 10), password: process.env.REDIS_PASSWORD || undefined };
// }

export default () => ({
  port:     parseInt(process.env.PORT || '3001', 10),
  frontend: process.env.FRONTEND_URL || 'http://localhost:3000',

  redis: parseRedis(),
 
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/campushub_realtime',
  },
 
  database: {
    host:     process.env.DB_HOST || '127.0.0.1',
    port:     parseInt(process.env.DB_PORT || '3306', 10),
    name:     process.env.DB_NAME || 'backend_mbnglobal',
    user:     process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
  },
 
  session: {
    cookieName: process.env.SESSION_COOKIE_NAME || 'campushub_session',
  },

  backendUrl: process.env.BACKEND_URL || 'http://localhost:8000',
});