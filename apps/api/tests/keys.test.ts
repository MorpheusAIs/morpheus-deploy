import { describe, it, expect, beforeAll, vi } from 'vitest';
import { Hono } from 'hono';
import { keys } from '../src/routes/keys.js';

vi.mock('../src/middleware/auth.js', () => ({
  createAuthMiddleware: () => async (c: any, next: () => Promise<void>) => {
    const authHeader = c.req.header('Authorization');
    if (authHeader === 'Bearer wallet_token') {
      c.set('auth', {
        userId: 'user_0x1234',
        address: '0x1234567890abcdef',
        method: 'wallet',
      });
    } else if (authHeader === 'Bearer api_key_token') {
      c.set('auth', {
        userId: 'user_0x1234',
        method: 'api_key',
      });
    }
    await next();
  },
  getAuthContext: (c: any) => c.get('auth'),
}));

describe('API Keys Routes', () => {
  let app: Hono;

  beforeAll(() => {
    app = new Hono();
    app.route('/api/keys', keys);
  });

  describe('GET /api/keys', () => {
    it('returns list of API keys', async () => {
      const res = await app.request('/api/keys', {
        headers: { Authorization: 'Bearer wallet_token' },
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.keys).toBeDefined();
      expect(Array.isArray(body.keys)).toBe(true);
      expect(body.keys.length).toBeGreaterThan(0);
      expect(body.keys[0]).toHaveProperty('id');
      expect(body.keys[0]).toHaveProperty('name');
      expect(body.keys[0]).toHaveProperty('prefix');
    });
  });

  describe('POST /api/keys', () => {
    it('creates a new API key with wallet auth', async () => {
      const res = await app.request('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer wallet_token',
        },
        body: JSON.stringify({
          name: 'Test Key',
          permissions: ['deploy', 'status'],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toMatch(/^key_/);
      expect(body.key).toMatch(/^mor_sk_/);
      expect(body.name).toBe('Test Key');
      expect(body.prefix).toMatch(/^mor_sk_/);
    });

    it('returns 403 when using API key auth', async () => {
      const res = await app.request('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer api_key_token',
        },
        body: JSON.stringify({
          name: 'Test Key',
          permissions: ['deploy'],
        }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('DELETE /api/keys/:id', () => {
    it('revokes an API key with wallet auth', async () => {
      const res = await app.request('/api/keys/key_abc123', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer wallet_token' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.id).toBe('key_abc123');
      expect(body.revokedAt).toBeDefined();
    });

    it('returns 403 when using API key auth', async () => {
      const res = await app.request('/api/keys/key_abc123', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer api_key_token' },
      });

      expect(res.status).toBe(403);
    });
  });
});
