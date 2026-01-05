import { cors } from 'hono/cors';
import { getConfig } from '../lib/config.js';

export function createCorsMiddleware() {
  const config = getConfig();

  return cors({
    origin: config.corsOrigins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400,
    credentials: true,
  });
}
