import { describe, it, expect, beforeAll } from 'vitest';
import { Hono } from 'hono';
import { auth } from '../src/routes/auth.js';

describe('Auth Routes', () => {
  let app: Hono;

  beforeAll(() => {
    app = new Hono();
    app.route('/api/auth', auth);
  });

  describe('GET /api/auth/nonce', () => {
    it('returns a nonce and session ID', async () => {
      const res = await app.request('/api/auth/nonce');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.nonce).toBeDefined();
      expect(body.nonce).toHaveLength(17);
      expect(body.sessionId).toBeDefined();
      expect(body.sessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('returns unique nonces on each request', async () => {
      const res1 = await app.request('/api/auth/nonce');
      const res2 = await app.request('/api/auth/nonce');

      const body1 = await res1.json();
      const body2 = await res2.json();

      expect(body1.nonce).not.toBe(body2.nonce);
      expect(body1.sessionId).not.toBe(body2.sessionId);
    });
  });

  describe('POST /api/auth/verify', () => {
    it('returns 400 for invalid session', async () => {
      const res = await app.request('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test message',
          signature: '0x1234',
          sessionId: 'invalid-session-id',
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for missing fields', async () => {
      const res = await app.request('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/github', () => {
    it('returns 500 when GitHub OAuth is not configured', async () => {
      const res = await app.request('/api/auth/github');
      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body.error).toBe('GitHub OAuth not configured');
    });
  });

  describe('GET /api/auth/github/callback', () => {
    it('redirects on missing params', async () => {
      const res = await app.request('/api/auth/github/callback');
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toContain('error');
    });
  });
});
