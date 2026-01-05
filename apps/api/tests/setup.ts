import { vi } from 'vitest';

vi.mock('../src/lib/config.js', () => ({
  getConfig: () => ({
    port: 3001,
    host: 'localhost',
    nodeEnv: 'test',
    databaseUrl: 'postgresql://test:test@localhost:5432/test',
    jwtSecret: 'test-secret-key-for-jwt-signing-32chars',
    frontendUrl: 'http://localhost:3000',
    apiUrl: 'http://localhost:3001',
    network: 'testnet',
    githubClientId: null,
    githubClientSecret: null,
    githubCallbackUrl: 'http://localhost:3001/api/auth/github/callback',
    akashNode: 'https://rpc.sandbox-01.akash.network:443',
    akashChainId: 'sandbox-01',
    baseRpcUrl: 'https://sepolia.base.org',
    skipGoApiUrl: 'https://api.skip.money',
  }),
}));
