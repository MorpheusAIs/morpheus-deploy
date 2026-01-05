export interface Config {
  port: number;
  host: string;
  nodeEnv: 'development' | 'production' | 'test';
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  githubClientId: string;
  githubClientSecret: string;
  githubCallbackUrl: string;
  frontendUrl: string;
  corsOrigins: string[];
  rateLimitRequestsPerMinute: number;
  rateLimitDeploymentsPerDay: number;
  network: 'mainnet' | 'testnet';
  akashRpcUrl: string;
  baseRpcUrl: string;
}

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export function loadConfig(): Config {
  const nodeEnv = getEnvOrDefault('NODE_ENV', 'development') as Config['nodeEnv'];
  const isDev = nodeEnv === 'development';

  return {
    port: parseInt(getEnvOrDefault('PORT', '3001'), 10),
    host: getEnvOrDefault('HOST', '0.0.0.0'),
    nodeEnv,
    databaseUrl: isDev
      ? getEnvOrDefault('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/morpheus')
      : getEnvOrThrow('DATABASE_URL'),
    jwtSecret: isDev
      ? getEnvOrDefault('JWT_SECRET', 'dev-secret-change-in-production')
      : getEnvOrThrow('JWT_SECRET'),
    jwtExpiresIn: getEnvOrDefault('JWT_EXPIRES_IN', '24h'),
    githubClientId: getEnvOrDefault('GITHUB_CLIENT_ID', ''),
    githubClientSecret: getEnvOrDefault('GITHUB_CLIENT_SECRET', ''),
    githubCallbackUrl: getEnvOrDefault(
      'GITHUB_CALLBACK_URL',
      'http://localhost:3001/api/auth/github/callback'
    ),
    frontendUrl: getEnvOrDefault('FRONTEND_URL', 'http://localhost:3000'),
    corsOrigins: getEnvOrDefault('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001')
      .split(',')
      .map((s) => s.trim()),
    rateLimitRequestsPerMinute: parseInt(
      getEnvOrDefault('RATE_LIMIT_REQUESTS_PER_MINUTE', '100'),
      10
    ),
    rateLimitDeploymentsPerDay: parseInt(
      getEnvOrDefault('RATE_LIMIT_DEPLOYMENTS_PER_DAY', '10'),
      10
    ),
    network: getEnvOrDefault('MORPHEUS_NETWORK', 'testnet') as Config['network'],
    akashRpcUrl: getEnvOrDefault('AKASH_RPC_URL', 'https://rpc.sandbox-01.akash.network:443'),
    baseRpcUrl: getEnvOrDefault('BASE_RPC_URL', 'https://sepolia.base.org'),
  };
}

let configInstance: Config | null = null;

export function getConfig(): Config {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}
