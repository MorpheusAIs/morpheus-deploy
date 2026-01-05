import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';
import * as jose from 'jose';
import { getConfig } from '../lib/config.js';
import { unauthorized, forbidden } from '../lib/errors.js';
import type { AuthContext } from '../lib/types.js';

const API_KEY_PREFIX = 'mor_sk_';

async function validateApiKey(key: string): Promise<AuthContext | null> {
  if (!key.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  return {
    method: 'api-key',
    userId: 'user_mock',
    apiKeyId: 'key_mock',
    permissions: ['deploy', 'status', 'logs', 'fund', 'close'],
  };
}

async function validateJWT(token: string): Promise<AuthContext | null> {
  const config = getConfig();

  try {
    const secret = new TextEncoder().encode(config.jwtSecret);
    const { payload } = await jose.jwtVerify(token, secret);

    return {
      method: payload.method as AuthContext['method'],
      userId: payload.sub as string,
      walletAddress: payload.wallet as string | undefined,
      permissions: (payload.permissions as string[]) || ['deploy', 'status', 'logs'],
    };
  } catch {
    return null;
  }
}

export function createAuthMiddleware(options: { required?: boolean } = {}) {
  const { required = true } = options;

  return createMiddleware(async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
      if (required) {
        const error = unauthorized('Missing Authorization header');
        return c.json(error.toJSON(), 401);
      }
      return next();
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      const error = unauthorized('Invalid Authorization header format');
      return c.json(error.toJSON(), 401);
    }

    let authContext: AuthContext | null = null;

    if (token.startsWith(API_KEY_PREFIX)) {
      authContext = await validateApiKey(token);
    } else {
      authContext = await validateJWT(token);
    }

    if (!authContext) {
      const error = unauthorized('Invalid or expired token');
      return c.json(error.toJSON(), 401);
    }

    c.set('auth', authContext);
    return next();
  });
}

export function requirePermission(...requiredPermissions: string[]) {
  return createMiddleware(async (c, next) => {
    const auth = c.get('auth') as AuthContext | undefined;

    if (!auth) {
      const error = unauthorized();
      return c.json(error.toJSON(), 401);
    }

    const hasPermission = requiredPermissions.every((p) => auth.permissions.includes(p));

    if (!hasPermission) {
      const error = forbidden(`Missing required permissions: ${requiredPermissions.join(', ')}`);
      return c.json(error.toJSON(), 403);
    }

    return next();
  });
}

export async function createSessionToken(
  userId: string,
  walletAddress: string,
  method: AuthContext['method'] = 'wallet'
): Promise<string> {
  const config = getConfig();
  const secret = new TextEncoder().encode(config.jwtSecret);

  const token = await new jose.SignJWT({
    method,
    wallet: walletAddress,
    permissions: ['deploy', 'status', 'logs', 'fund', 'close'],
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(config.jwtExpiresIn)
    .sign(secret);

  return token;
}

export function getAuthContext(c: Context): AuthContext | undefined {
  return c.get('auth') as AuthContext | undefined;
}
