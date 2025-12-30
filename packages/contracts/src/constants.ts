import type { Address } from 'viem';

export const CHAIN_CONFIG: Record<'mainnet' | 'testnet', {
  chainId: number;
  name: string;
  rpcUrl: string;
  usdc: Address;
  mor: Address;
  smartWalletFactory: Address;
}> = {
  mainnet: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    mor: '0x0000000000000000000000000000000000000000', // TODO: Add MOR token address
    smartWalletFactory: '0x0BA5ED0c6AA8c49038F819E587E2633c4A9F428a', // Coinbase Smart Wallet Factory
  },
  testnet: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    mor: '0x0000000000000000000000000000000000000000', // TODO: Add testnet MOR
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
