import { createMiddleware } from 'hono/factory';
import { getConfig } from '../lib/config.js';
import { rateLimited } from '../lib/errors.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

setInterval(cleanupExpiredEntries, 60000);

export function createRateLimitMiddleware() {
  const config = getConfig();
  const limit = config.rateLimitRequestsPerMinute;
  const windowMs = 60000;

  return createMiddleware(async (c, next) => {
    const identifier =
      c.req.header('Authorization') || c.req.header('X-Forwarded-For') || 'anonymous';
    const key = `ratelimit:${identifier}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    c.res.headers.set('X-RateLimit-Limit', limit.toString());
    c.res.headers.set('X-RateLimit-Remaining', Math.max(0, limit - entry.count).toString());
    c.res.headers.set('X-RateLimit-Reset', Math.floor(entry.resetAt / 1000).toString());

    if (entry.count > limit) {
      const error = rateLimited(Math.ceil((entry.resetAt - now) / 1000));
      return c.json(error.toJSON(), 429);
    }

    return next();
  });
}
