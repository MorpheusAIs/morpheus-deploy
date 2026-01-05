import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { getConfig } from './lib/config.js';
import { createCorsMiddleware } from './middleware/cors.js';
import { createLoggingMiddleware } from './middleware/logging.js';
import { createRateLimitMiddleware } from './middleware/rate-limit.js';
import { health } from './routes/health.js';
import { auth } from './routes/auth.js';
import { deploy } from './routes/deploy.js';
import { deployments } from './routes/deployments.js';
import { keys } from './routes/keys.js';
import { button } from './routes/button.js';
import { webhook } from './routes/webhook.js';
import { ApiError } from './lib/errors.js';

const app = new Hono();

app.use('*', createCorsMiddleware());
app.use('*', createLoggingMiddleware());
app.use('/api/*', createRateLimitMiddleware());

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json(err.toJSON(), err.status as 400);
  }

  console.error('Unhandled error:', err);
  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    500
  );
});

app.route('/health', health);
app.route('/api/auth', auth);
app.route('/api/deploy', deploy);
app.route('/api/deployments', deployments);
app.route('/api/keys', keys);
app.route('/api/button', button);
app.route('/api/webhooks', webhook);

app.get('/', (c) => {
  return c.json({
    name: 'Morpheus Deploy API',
    version: '0.1.0',
    docs: 'https://morpheus.network/docs/api',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      deploy: '/api/deploy',
      deployments: '/api/deployments/*',
      keys: '/api/keys/*',
      button: '/api/button/*',
      webhooks: '/api/webhooks/*',
    },
  });
});

app.notFound((c) => {
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    },
    404
  );
});

const config = getConfig();

console.log(`
  Morpheus Deploy API
  -------------------
  Environment: ${config.nodeEnv}
  Port: ${config.port}
  Network: ${config.network}
  Frontend: ${config.frontendUrl}
`);

serve({
  fetch: app.fetch,
  port: config.port,
  hostname: config.host,
});

console.log(`Server running at http://${config.host}:${config.port}`);

export default app;
