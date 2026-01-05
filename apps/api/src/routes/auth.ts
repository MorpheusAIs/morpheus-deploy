import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { SiweMessage, generateNonce } from 'siwe';
import { createSessionToken } from '../middleware/auth.js';
import { getConfig } from '../lib/config.js';
import { unauthorized, validationError } from '../lib/errors.js';

const auth = new Hono();

const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

function cleanupExpiredNonces() {
  const now = Date.now();
  for (const [key, entry] of nonceStore.entries()) {
    if (entry.expiresAt < now) {
      nonceStore.delete(key);
    }
  }
}

setInterval(cleanupExpiredNonces, 60000);

auth.get('/nonce', (c) => {
  const nonce = generateNonce();
  const sessionId = crypto.randomUUID();

  nonceStore.set(sessionId, {
    nonce,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  return c.json({ nonce, sessionId });
});

const VerifySchema = z.object({
  message: z.string(),
  signature: z.string(),
  sessionId: z.string(),
});

auth.post('/verify', zValidator('json', VerifySchema), async (c) => {
  const { message, signature, sessionId } = c.req.valid('json');

  const storedSession = nonceStore.get(sessionId);
  if (!storedSession) {
    const error = validationError('Invalid or expired session');
    return c.json(error.toJSON(), 400);
  }

  try {
    const siweMessage = new SiweMessage(message);
    const { success, data } = await siweMessage.verify({ signature });

    if (!success) {
      const error = unauthorized('Invalid signature');
      return c.json(error.toJSON(), 401);
    }

    if (data.nonce !== storedSession.nonce) {
      const error = unauthorized('Nonce mismatch');
      return c.json(error.toJSON(), 401);
    }

    nonceStore.delete(sessionId);

    const userId = `user_${data.address.toLowerCase()}`;
    const token = await createSessionToken(userId, data.address);

    return c.json({
      token,
      address: data.address,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    const apiError = validationError('Invalid SIWE message format');
    return c.json(apiError.toJSON(), 400);
  }
});

auth.get('/github', (c) => {
  const config = getConfig();

  if (!config.githubClientId) {
    return c.json({ error: 'GitHub OAuth not configured' }, 500);
  }

  const state = crypto.randomUUID();
  nonceStore.set(`github:${state}`, { nonce: state, expiresAt: Date.now() + 10 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: config.githubClientId,
    redirect_uri: config.githubCallbackUrl,
    scope: 'repo read:user user:email',
    state,
  });

  return c.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

auth.get('/github/callback', async (c) => {
  const config = getConfig();
  const code = c.req.query('code');
  const state = c.req.query('state');

  if (!code || !state) {
    return c.redirect(`${config.frontendUrl}/auth/error?message=missing_params`);
  }

  const storedState = nonceStore.get(`github:${state}`);
  if (!storedState) {
    return c.redirect(`${config.frontendUrl}/auth/error?message=invalid_state`);
  }

  nonceStore.delete(`github:${state}`);

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.githubClientId,
        client_secret: config.githubClientSecret,
        code,
      }),
    });

    const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };

    if (tokenData.error || !tokenData.access_token) {
      return c.redirect(`${config.frontendUrl}/auth/error?message=token_exchange_failed`);
    }

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    const userData = (await userResponse.json()) as { id: number; login: string };
    const userId = `github_${userData.id}`;

    const token = await createSessionToken(userId, '', 'github');

    return c.redirect(`${config.frontendUrl}/auth/success?token=${token}`);
  } catch {
    return c.redirect(`${config.frontendUrl}/auth/error?message=github_error`);
  }
});

export { auth };
