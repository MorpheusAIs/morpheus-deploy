import { beforeAll, afterAll } from 'vitest';
import { createTestClient, createPublicClient, createWalletClient, http, publicActions, walletActions } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment
dotenv.config({ path: path.join(process.cwd(), '.env.test') });

// Fork configuration
export const FORK_CONFIG = {
  rpcUrl: process.env.FORK_RPC_URL || 'http://127.0.0.1:8545',
  chainId: Number(process.env.FORK_CHAIN_ID) || 84532,
};

// Contract addresses on forked Base Sepolia
export const CONTRACTS = {
  usdc: (process.env.USDC_ADDRESS as `0x${string}`) || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  mor: (process.env.MOR_ADDRESS as `0x${string}`) || '0x5c80ddd187054e1e4abbffcd750498e81d34ffa3',
  staking: (process.env.STAKING_ADDRESS as `0x${string}`) || '0x6C3401D71CEd4b4fEFD1033EA5F83e9B3E7e4381',
  walletFactory: (process.env.WALLET_FACTORY as `0x${string}`) || '0x0BA5ED0c6AA8c49038F819E587E2633c4A9F428a',
  subnetId: (process.env.SUBNET_ID as `0x${string}`) || '0xab4d64309bda15052e3e9133923a6b3d3b617bea4ab70a8d1bbebb3e94c1bf22',
};

// Test accounts from Anvil
export const TEST_ACCOUNTS = [
  {
    privateKey: (process.env.TEST_PRIVATE_KEY_0 as `0x${string}`) || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    address: (process.env.TEST_ACCOUNT_0 as `0x${string}`) || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  },
  {
    privateKey: (process.env.TEST_PRIVATE_KEY_1 as `0x${string}`) || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    address: (process.env.TEST_ACCOUNT_1 as `0x${string}`) || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  },
  {
    privateKey: (process.env.TEST_PRIVATE_KEY_2 as `0x${string}`) || '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
    address: (process.env.TEST_ACCOUNT_2 as `0x${string}`) || '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  },
];

// Global clients
export let publicClient: ReturnType<typeof createPublicClient>;
export let testClient: ReturnType<typeof createTestClient>;

/**
 * Setup fork connection before all tests
 */
beforeAll(async () => {
  console.log('🔧 Setting up fork connection...');
  console.log(`   RPC: ${FORK_CONFIG.rpcUrl}`);
  console.log(`   Chain ID: ${FORK_CONFIG.chainId}`);

  // Create public client for reading
  publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(FORK_CONFIG.rpcUrl),
  });

  // Create test client for fork manipulation
  testClient = createTestClient({
    chain: baseSepolia,
    mode: 'anvil',
    transport: http(FORK_CONFIG.rpcUrl),
  })
    .extend(publicActions)
    .extend(walletActions);

  // Verify fork is accessible
  try {
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`   ✓ Fork is running at block ${blockNumber.toLocaleString()}`);
  } catch (error) {
    console.error('   ✗ Failed to connect to fork');
    console.error('   Make sure Anvil is running: npm run fork:start');
    throw error;
  }

  // Verify contracts exist on fork
  const usdcCode = await publicClient.getBytecode({ address: CONTRACTS.usdc });
  if (!usdcCode || usdcCode === '0x') {
    console.warn(`   ⚠️  USDC contract not found at ${CONTRACTS.usdc}`);
  } else {
    console.log(`   ✓ USDC contract verified`);
  }

  console.log('✅ Fork setup complete\n');
}, 30000);

/**
 * Cleanup after all tests
 */
afterAll(async () => {
  console.log('\n🧹 Cleaning up fork...');
  // Any cleanup needed
  console.log('✅ Cleanup complete');
});

/**
 * Create a wallet client for a test account
 */
export function createTestWallet(accountIndex = 0) {
  const account = TEST_ACCOUNTS[accountIndex];
  if (!account) {
    throw new Error(`Test account ${accountIndex} not found`);
  }

  return createWalletClient({
    account: privateKeyToAccount(account.privateKey),
    chain: baseSepolia,
    transport: http(FORK_CONFIG.rpcUrl),
  });
}

/**
 * Get balance of an account in ETH
 */
export async function getBalance(address: `0x${string}`) {
  return publicClient.getBalance({ address });
}

/**
 * Mine blocks on the fork
 */
export async function mineBlocks(count: number) {
  await testClient.mine({ blocks: count });
}

/**
 * Set block timestamp on the fork
 */
export async function setBlockTimestamp(timestamp: number) {
  await testClient.setNextBlockTimestamp({ timestamp: BigInt(timestamp) });
  await testClient.mine({ blocks: 1 });
}

/**
 * Impersonate an account (useful for testing with whale addresses)
 */
export async function impersonateAccount(address: `0x${string}`) {
  await testClient.impersonateAccount({ address });
}

/**
 * Stop impersonating an account
 */
export async function stopImpersonatingAccount(address: `0x${string}`) {
  await testClient.stopImpersonatingAccount({ address });
}

/**
 * Reset fork to a specific block
 */
export async function resetFork(blockNumber?: bigint) {
  await testClient.reset({
    blockNumber,
    jsonRpcUrl: 'https://sepolia.base.org',
  });
}

/**
 * Get current block number
 */
export async function getBlockNumber() {
  return publicClient.getBlockNumber();
}

/**
 * Wait for a transaction to be mined
 */
export async function waitForTransaction(hash: `0x${string}`) {
  return publicClient.waitForTransactionReceipt({ hash });
}
