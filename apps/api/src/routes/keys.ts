import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { createAuthMiddleware, getAuthContext } from '../middleware/auth.js';
import { CreateApiKeySchema } from '../lib/types.js';
import { validationError, forbidden } from '../lib/errors.js';

const keys = new Hono();

keys.use('*', createAuthMiddleware());

keys.post('/', async (c) => {
  const auth = getAuthContext(c);
  if (!auth || auth.method !== 'wallet') {
    const error = forbidden('API keys can only be created with wallet authentication');
    return c.json(error.toJSON(), 403);
  }

  const body = await c.req.json();
  const parseResult = CreateApiKeySchema.safeParse(body);
  if (!parseResult.success) {
    const error = validationError('Invalid request body');
    return c.json(error.toJSON(), 400);
  }

  const { name, permissions, expiresAt } = parseResult.data;
  const keyId = `key_${nanoid(12)}`;
  const secretKey = `mor_sk_${nanoid(32)}`;
  const prefix = secretKey.slice(0, 12);

  return c.json(
    {
      id: keyId,
      key: secretKey,
      name,
      prefix,
      permissions,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || null,
    },
    201
  );
});

keys.get('/', async (c) => {
  const auth = getAuthContext(c);

  return c.json({
    keys: [
      {
        id: 'key_abc123',
        name: 'Development Key',
        prefix: 'mor_sk_a1b2',
        permissions: ['deploy', 'status', 'logs'],
        lastUsedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        expiresAt: null,
      },
    ],
    userId: auth?.userId,
  });
});

keys.delete('/:id', async (c) => {
  const keyId = c.req.param('id');
  const auth = getAuthContext(c);

  if (auth?.method !== 'wallet') {
    const error = forbidden('API keys can only be revoked with wallet authentication');
    return c.json(error.toJSON(), 403);
  }

  return c.json({
    success: true,
    id: keyId,
    revokedAt: new Date().toISOString(),
  });
});

export { keys };
