// =====================================================================
// src/config/configuration.ts
// =====================================================================
export default () => ({
  port:     parseInt(process.env.PORT || '3001', 10),
  frontend: process.env.FRONTEND_URL || 'http://localhost:3000',
 
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
 
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