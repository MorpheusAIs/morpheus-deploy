import { describe, it, expect, beforeAll } from 'vitest';
import { Hono } from 'hono';
import { button } from '../src/routes/button.js';

describe('Button Routes', () => {
  let app: Hono;

  beforeAll(() => {
    app = new Hono();
    app.route('/api/button', button);
  });

  describe('GET /api/button', () => {
    it('returns SVG badge', async () => {
      const res = await app.request('/api/button');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('image/svg+xml');

      const svg = await res.text();
      expect(svg).toContain('<svg');
      expect(svg).toContain('Deploy on Morpheus');
    });

    it('supports style parameter', async () => {
      const res = await app.request('/api/button?style=for-the-badge');
      expect(res.status).toBe(200);

      const svg = await res.text();
      expect(svg).toContain('<svg');
    });

    it('supports custom color', async () => {
      const res = await app.request('/api/button?color=%23ff0000');
      expect(res.status).toBe(200);

      const svg = await res.text();
      expect(svg).toContain('#ff0000');
    });
  });

  describe('GET /api/button/redirect', () => {
    it('redirects to deploy page with repo', async () => {
      const res = await app.request('/api/button/redirect?repo=user/repo');
      expect(res.status).toBe(302);
      const location = res.headers.get('location') || '';
      expect(location).toContain('/deploy');
      expect(location).toContain('repo=');
      expect(decodeURIComponent(location)).toContain('user/repo');
    });

    it('includes template in redirect', async () => {
      const res = await app.request('/api/button/redirect?repo=user/repo&template=ai-agent');
      expect(res.status).toBe(302);
      const location = res.headers.get('location') || '';
      expect(decodeURIComponent(location)).toContain('user/repo');
      expect(location).toContain('template=ai-agent');
    });
  });

  describe('GET /api/button/embed', () => {
    it('returns markdown embed code by default', async () => {
      const res = await app.request('/api/button/embed?repo=user/repo');
      expect(res.status).toBe(200);

      const text = await res.text();
      expect(text).toContain('Deploy on Morpheus');
      expect(text).toContain('[![');
    });

    it('returns HTML embed code when requested', async () => {
      const res = await app.request('/api/button/embed?repo=user/repo&format=html');
      expect(res.status).toBe(200);

      const text = await res.text();
      expect(text).toContain('<a');
      expect(text).toContain('Deploy on Morpheus');
    });

    it('returns 400 without repo param', async () => {
      const res = await app.request('/api/button/embed');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/button/config', () => {
    it('returns repository config and cost estimate', async () => {
      const res = await app.request('/api/button/config?repo=user/repo');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.repository).toBeDefined();
      expect(body.suggestedConfig).toBeDefined();
      expect(body.estimate).toBeDefined();
      expect(body.estimate.monthlyRate).toBeGreaterThan(0);
    });

    it('returns 400 without repo param', async () => {
      const res = await app.request('/api/button/config');
      expect(res.status).toBe(400);
    });
  });
});
