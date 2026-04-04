// =====================================================================
// src/config/configuration.ts
// =====================================================================

// Always use separate vars — REDIS_URL may be injected by Railway without password
function parseRedis() {
  const host     = process.env.REDIS_HOST || 'localhost';
  const port     = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;
  console.log(`[parseRedis] host=${host} port=${port} password=${password ? 'SET' : 'NOT SET'}`);
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