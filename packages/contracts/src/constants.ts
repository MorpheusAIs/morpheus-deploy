import type { Address } from 'viem';

/**
 * Mainnet feature flag
 * Addresses audit finding M-3: Missing mainnet configuration guards
 *
 * Set to true only after:
 * 1. Mainnet contracts are deployed and verified
 * 2. MOR token address is configured
 * 3. Subnet ID is configured
 * 4. Security audit is complete
 */
export const MAINNET_ENABLED = false;

export const CHAIN_CONFIG: Record<'mainnet' | 'testnet', {
  chainId: number;
  name: string;
  rpcUrl: string;
  /** Fallback RPC URLs - addresses audit finding L-1 */
  rpcUrls: string[];
  usdc: Address;
  mor: Address;
  smartWalletFactory: Address;
}> = {
  mainnet: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    rpcUrls: [
      'https://mainnet.base.org',
      'https://base.llamarpc.com',
      'https://base.blockpi.network/v1/rpc/public',
      'https://1rpc.io/base',
    ],
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    mor: '0x0000000000000000000000000000000000000000', // TODO: Add MOR token address
    smartWalletFactory: '0x0BA5ED0c6AA8c49038F819E587E2633c4A9F428a', // Coinbase Smart Wallet Factory
  },
  testnet: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    rpcUrls: [
      'https://sepolia.base.org',
      'https://base-sepolia.blockpi.network/v1/rpc/public',
      'https://base-sepolia-rpc.publicnode.com',
    ],
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    mor: '0x5c80ddd187054e1e4abbffcd750498e81d34ffa3', // MOR token on Base Sepolia
    smartWalletFactory: '0x0BA5ED0c6AA8c49038F819E587E2633c4A9F428a',
  },
};

export const AKASH_CONFIG = {
  mainnet: {
    chainId: 'akashnet-2',
    rpcUrl: 'https://rpc.akashnet.net:443',
    restUrl: 'https://api.akashnet.net:443',
    denom: 'uakt',
  },
  testnet: {
    chainId: 'sandbox-01',
    rpcUrl: 'https://rpc.sandbox-01.akash.network:443',
    restUrl: 'https://api.sandbox-01.akash.network:443',
    denom: 'uakt',
  },
};

export const SKIP_GO_CONFIG = {
  baseUrl: 'https://api.skip.money',
  apiVersion: 'v2',
};

// Token decimals
export const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6,
  ETH: 18,
  MOR: 18,
  AKT: 6,
};

// Minimum amounts
export const MIN_DEPLOYMENT_DEPOSIT = '5000000'; // 5 AKT in uakt
export const GAS_STATION_THRESHOLD = 0.1; // 10% of lease escrow
export const DEFAULT_STAKING_SPLIT = 0.6; // 60% to MOR staking
