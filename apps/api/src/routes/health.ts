import { Hono } from 'hono';

const health = new Hono();

health.get('/', (c) => {
  return c.json({
    status: 'healthy',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

health.get('/ready', (c) => {
  return c.json({
    ready: true,
    checks: {
      database: true,
      network: true,
    },
  });
});

export { health };
