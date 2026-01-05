import { describe, it, expect, beforeAll } from 'vitest';
import { Hono } from 'hono';
import { health } from '../src/routes/health.js';

describe('Health Routes', () => {
  let app: Hono;

  beforeAll(() => {
    app = new Hono();
    app.route('/health', health);
  });

  describe('GET /health', () => {
    it('returns healthy status', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe('healthy');
      expect(body.version).toBe('0.1.0');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('GET /health/ready', () => {
    it('returns readiness status with checks', async () => {
      const res = await app.request('/health/ready');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ready).toBe(true);
      expect(body.checks).toEqual({
        database: true,
        network: true,
      });
    });
  });
});
