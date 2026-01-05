import { createMiddleware } from 'hono/factory';

export function createLoggingMiddleware() {
  return createMiddleware(async (c, next) => {
    const start = Date.now();
    const requestId = crypto.randomUUID();

    c.set('requestId', requestId);
    c.res.headers.set('X-Request-ID', requestId);

    const method = c.req.method;
    const path = c.req.path;

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

    const logMessage = JSON.stringify({
      level: logLevel,
      requestId,
      method,
      path,
      status,
      duration,
      timestamp: new Date().toISOString(),
    });

    console.log(logMessage);
  });
}
