import { Hono } from 'hono';
import { getConfig } from '../lib/config.js';

const button = new Hono();

function generateButtonSvg(options: { text?: string; style?: string; color?: string }): string {
  const text = options.text || 'Deploy on Morpheus';
  const color = options.color || '#14b8a6';
  const textColor = '#ffffff';
  const bgColor = '#0f172a';
  const width = 180;
  const height = 32;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="6" fill="url(#gradient)" stroke="${color}" stroke-width="1"/>
  <text x="12" y="21" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="${textColor}">
    <tspan fill="${color}">&#9654;</tspan> ${text}
  </text>
</svg>`;
}

button.get('/', (c) => {
  const style = c.req.query('style') || 'flat';
  const color = c.req.query('color') || '#14b8a6';

  const svg = generateButtonSvg({ style, color });

  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', 'public, max-age=3600');
  return c.body(svg);
});

button.get('/redirect', (c) => {
  const config = getConfig();
  const repo = c.req.query('repo');
  const template = c.req.query('template');
  const branch = c.req.query('branch');

  if (!repo) {
    return c.json({ error: 'Missing repo parameter' }, 400);
  }

  const deployUrl = new URL(`${config.frontendUrl}/deploy`);
  deployUrl.searchParams.set('repo', repo);
  if (template) deployUrl.searchParams.set('template', template);
  if (branch) deployUrl.searchParams.set('branch', branch);

  return c.redirect(deployUrl.toString());
});

button.get('/embed', (c) => {
  const config = getConfig();
  const repo = c.req.query('repo');
  const template = c.req.query('template');
  const format = c.req.query('format') || 'markdown';

  if (!repo) {
    return c.json({ error: 'Missing repo parameter' }, 400);
  }

  const buttonUrl = `${config.frontendUrl}/api/button?repo=${encodeURIComponent(repo)}`;
  const deployUrl = `${config.frontendUrl}/deploy?repo=${encodeURIComponent(repo)}${template ? `&template=${template}` : ''}`;

  if (format === 'html') {
    return c.text(`<a href="${deployUrl}"><img src="${buttonUrl}" alt="Deploy on Morpheus" /></a>`);
  }

  return c.text(`[![Deploy on Morpheus](${buttonUrl})](${deployUrl})`);
});

button.get('/config', async (c) => {
  const repo = c.req.query('repo');
  const template = c.req.query('template');

  if (!repo) {
    return c.json({ error: 'Missing repo parameter' }, 400);
  }

  return c.json({
    repository: {
      name: repo.split('/').pop() || repo,
      fullName: repo,
      defaultBranch: 'main',
      language: 'TypeScript',
    },
    suggestedConfig: {
      template: template || 'ai-agent',
      resources: {
        cpu: 2,
        memory: '4Gi',
        storage: '10Gi',
      },
      envVars: ['API_KEY', 'MODEL'],
    },
    estimate: {
      setupTime: '~2 minutes',
      hourlyRate: 0.15,
      dailyRate: 3.6,
      monthlyRate: 108.0,
      currency: 'USD',
    },
  });
});

export { button };
