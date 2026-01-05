import { Hono } from 'hono';
import { createAuthMiddleware, requirePermission, getAuthContext } from '../middleware/auth.js';
import { DeployRequestSchema, PreviewRequestSchema } from '../lib/types.js';
import { validationError } from '../lib/errors.js';

const deploy = new Hono();

deploy.use('*', createAuthMiddleware());

deploy.post('/', requirePermission('deploy'), async (c) => {
  const body = await c.req.json();

  const parseResult = DeployRequestSchema.safeParse(body);
  if (!parseResult.success) {
    const error = validationError('Invalid request body', {
      issues: parseResult.error.issues.map((i) => i.message).join(', '),
    });
    return c.json(error.toJSON(), 400);
  }

  const auth = getAuthContext(c);
  const request = parseResult.data;

  const deploymentId = `dep_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const dseq = Math.floor(Date.now() / 1000).toString();

  return c.json(
    {
      id: deploymentId,
      dseq,
      status: 'pending',
      repoUrl: request.repoUrl,
      branch: request.branch,
      template: request.template || 'custom',
      userId: auth?.userId,
      estimatedTime: '2-3 minutes',
      createdAt: new Date().toISOString(),
    },
    201
  );
});

deploy.post('/preview', requirePermission('deploy'), async (c) => {
  const body = await c.req.json();

  const parseResult = PreviewRequestSchema.safeParse(body);
  if (!parseResult.success) {
    const error = validationError('Invalid request body');
    return c.json(error.toJSON(), 400);
  }

  const request = parseResult.data;
  const resources = request.resources || { cpu: 2, memory: '4Gi', storage: '10Gi' };

  const hourlyRate = calculateHourlyRate(resources);

  return c.json({
    estimate: {
      hourlyRate,
      dailyRate: hourlyRate * 24,
      monthlyRate: hourlyRate * 24 * 30,
      currency: 'USD',
    },
    resources,
    suggestedTemplate: request.template || 'ai-agent',
    detectedFramework: 'node',
  });
});

function calculateHourlyRate(resources: {
  cpu?: number;
  memory?: string;
  gpu?: { model?: string; count?: number };
}): number {
  const cpuCost = (resources.cpu || 2) * 0.02;
  const memoryGb = parseMemory(resources.memory ?? '4Gi');
  const memoryCost = memoryGb * 0.01;
  const gpuCost = resources.gpu ? 0.5 * (resources.gpu.count || 1) : 0;

  return Math.round((cpuCost + memoryCost + gpuCost) * 100) / 100;
}

function parseMemory(memory: string): number {
  const match = memory.match(/^(\d+)(Gi|Mi)$/);
  if (!match || !match[1] || !match[2]) return 4;
  const value = parseInt(match[1], 10);
  return match[2] === 'Gi' ? value : value / 1024;
}

export { deploy };
