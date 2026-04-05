// =====================================================================
// src/config/configuration.ts
// =====================================================================

// Build the Redis URL from environment variables.
// Priority: REDIS_URL (auto-injected by Railway with full credentials) > manual vars.
export function buildRedisUrl(): string {
  const railwayUrl = process.env.REDIS_URL;

  // Log all available Redis env vars to diagnose Railway injection
  console.log('[Redis env]', {
    REDIS_URL:      railwayUrl ? `${railwayUrl.substring(0, 15)}... (length=${railwayUrl.length})` : 'NOT SET',
    REDIS_HOST:     process.env.REDIS_HOST || 'NOT SET',
    REDIS_PORT:     process.env.REDIS_PORT || 'NOT SET',
    REDIS_PASSWORD: process.env.REDIS_PASSWORD
      ? `SET (length=${process.env.REDIS_PASSWORD.length}, first=${process.env.REDIS_PASSWORD[0]})`
      : 'NOT SET',
  });

  if (railwayUrl) {
    console.log('[Redis] Using REDIS_URL (Railway-injected)');
    return railwayUrl;
  }

  const host     = process.env.REDIS_HOST || 'localhost';
  const port     = process.env.REDIS_PORT || '6379';
  const password = process.env.REDIS_PASSWORD || '';
  console.log(`[Redis] Manual config → ${host}:${port} password=${password ? 'SET' : 'NOT SET'}`);

  return password
    ? `redis://default:${encodeURIComponent(password)}@${host}:${port}`
    : `redis://${host}:${port}`;
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