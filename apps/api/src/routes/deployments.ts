import { Hono } from 'hono';
import { createAuthMiddleware, requirePermission, getAuthContext } from '../middleware/auth.js';
import { FundDeploymentSchema } from '../lib/types.js';
import { validationError } from '../lib/errors.js';

const deployments = new Hono();

deployments.use('*', createAuthMiddleware());

deployments.get('/', requirePermission('status'), async (c) => {
  const auth = getAuthContext(c);

  return c.json({
    deployments: [
      {
        id: 'dep_example123',
        dseq: '1704067200',
        repoUrl: 'github.com/example/my-agent',
        status: 'active',
        template: 'ai-agent',
        serviceUrl: 'https://abc123.akash.network',
        createdAt: new Date().toISOString(),
      },
    ],
    userId: auth?.userId,
  });
});

deployments.get('/:dseq', requirePermission('status'), async (c) => {
  const dseq = c.req.param('dseq');
  const auth = getAuthContext(c);

  return c.json({
    id: `dep_${dseq.slice(0, 12)}`,
    dseq,
    status: 'active',
    provider: 'akash1provider...',
    serviceUrl: 'https://abc123.akash.network',
    escrowBalance: {
      amount: 45.5,
      currency: 'AKT',
      usdValue: 150.0,
    },
    estimatedTimeRemaining: '5 days',
    resources: {
      cpu: 2,
      memory: '4Gi',
      storage: '10Gi',
    },
    userId: auth?.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
});

deployments.delete('/:dseq', requirePermission('close'), async (c) => {
  const dseq = c.req.param('dseq');

  return c.json({
    success: true,
    dseq,
    refundedAmount: 25.0,
    refundCurrency: 'AKT',
    closedAt: new Date().toISOString(),
  });
});

deployments.post('/:dseq/fund', requirePermission('fund'), async (c) => {
  const dseq = c.req.param('dseq');
  const body = await c.req.json();

  const parseResult = FundDeploymentSchema.safeParse(body);
  if (!parseResult.success) {
    const error = validationError('Invalid request body');
    return c.json(error.toJSON(), 400);
  }

  const { amount, currency } = parseResult.data;

  return c.json({
    txHash: `0x${crypto.randomUUID().replace(/-/g, '')}`,
    dseq,
    swapDetails: {
      sourceAmount: amount,
      sourceCurrency: currency,
      destinationAmount: amount * 0.3,
      destinationCurrency: 'AKT',
    },
    newBalance: {
      amount: 53.0,
      currency: 'AKT',
    },
  });
});

deployments.get('/:dseq/logs', requirePermission('logs'), async (c) => {
  const dseq = c.req.param('dseq');

  return c.json({
    dseq,
    logs: [
      { timestamp: new Date().toISOString(), level: 'info', message: 'Application started' },
      { timestamp: new Date().toISOString(), level: 'info', message: 'Listening on port 8000' },
    ],
  });
});

export { deployments };
