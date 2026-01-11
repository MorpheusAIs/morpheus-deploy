import type { Address } from 'viem';

export const STAKING_ADDRESS: Record<'mainnet' | 'testnet', Address> = {
  mainnet: '0x42bb446eae6dca7723a9ebdb81ea88afe77ef4b9', // Builders V4 registry on Base Mainnet
  testnet: '0x6C3401D71CEd4b4fEFD1033EA5F83e9B3E7e4381', // Builders V4 registry on Base Sepolia
};

// Subnet IDs for Builders V4
// Subnet ID is calculated as keccak256(encodePacked(['string'], [subnetName]))
export const SUBNET_ID: Record<'mainnet' | 'testnet', `0x${string}`> = {
  mainnet: '0x0000000000000000000000000000000000000000000000000000000000000000', // TODO: Add mainnet subnet ID
  testnet: '0xcacd6c5bb3962e67d37cf2bc645deaa3109769abd779d455340c12da4380e71b', // Morpheus Deploy subnet on Base Sepolia (keccak256("Morpheus Deploy"))
};

export const STAKING_ABI = [
  // Builders V4 Read functions
  {
    name: 'getUserDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'subnetId_', type: 'bytes32' },
      { name: 'user_', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getSubnetDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'subnetId_', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'subnets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'subnetId_', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'admin', type: 'address' },
          { name: 'unusedStorage1_V4Update', type: 'uint128' },
          { name: 'withdrawLockPeriodAfterDeposit', type: 'uint128' },
          { name: 'unusedStorage2_V4Update', type: 'uint128' },
          { name: 'minimalDeposit', type: 'uint256' },
          { name: 'claimAdmin', type: 'address' },
        ],
      },
    ],
  },

  // Builders V4 Write functions
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'subnetId_', type: 'bytes32' },
      { name: 'amount_', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'subnetId_', type: 'bytes32' },
      { name: 'amount_', type: 'uint256' },
    ],
    outputs: [],
  },

  // Builders V4 Events
  {
    name: 'UserDeposited',
    type: 'event',
    inputs: [
      { name: 'subnetId', type: 'bytes32', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'UserWithdrawn',
    type: 'event',
    inputs: [
      { name: 'subnetId', type: 'bytes32', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;
