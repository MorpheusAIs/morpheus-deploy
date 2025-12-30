import type { Address } from 'viem';

// Wallet Types
export interface WalletState {
  address: Address;
  chainId: number;
  isConnected: boolean;
  isSmartWallet: boolean;
}

export interface TokenBalance {
  token: string;
  balance: bigint;
  decimals: number;
  formatted: string;
}

// Transaction Types
export interface TransactionResult {
  hash: string;
  status: 'pending' | 'success' | 'failed';
  blockNumber?: bigint;
  gasUsed?: bigint;
  error?: string;
}

// Akash Types
export interface AkashDeployment {
  dseq: string;
  owner: string;
  state: DeploymentState;
  version: Uint8Array;
  createdHeight: bigint;
}

export type DeploymentState =
  | 'active'
  | 'closed'
  | 'insufficient_funds';

export interface AkashLease {
  id: LeaseId;
  state: LeaseState;
  price: Coin;
  createdAt: bigint;
  closedOn: bigint;
}

export interface LeaseId {
  owner: string;
  dseq: string;
  gseq: number;
  oseq: number;
  provider: string;
}

export type LeaseState =
  | 'active'
  | 'closed'
  | 'insufficient_funds';

export interface Coin {
  denom: string;
  amount: string;
}

// Bid Types
export interface Bid {
  id: BidId;
  state: BidState;
  price: Coin;
  createdAt: bigint;
}

export interface BidId {
  owner: string;
  dseq: string;
  gseq: number;
  oseq: number;
  provider: string;
}

export type BidState =
  | 'open'
  | 'matched'
  | 'lost'
  | 'closed';

// Escrow Types
export interface EscrowAccount {
  id: EscrowAccountId;
  owner: string;
  state: EscrowState;
  balance: Coin;
  transferred: Coin;
  settledAt: bigint;
  depositor: string;
  funds: Coin;
}

export interface EscrowAccountId {
  scope: string;
  xid: string;
}

export type EscrowState =
  | 'open'
  | 'closed'
  | 'overdrawn';

// Provider Types
export interface Provider {
  owner: string;
  hostUri: string;
  attributes: Attribute[];
  info: ProviderInfo;
}

export interface ProviderInfo {
  email: string;
  website: string;
}

export interface Attribute {
  key: string;
  value: string;
}

// AuthZ Types
export interface Authorization {
  typeUrl: string;
  msg?: string;
  spendLimit?: Coin[];
}

export interface Grant {
  granter: string;
  grantee: string;
  authorization: Authorization;
  expiration: Date;
}

// Staking Types
export interface StakingPosition {
  stakedAmount: bigint;
  shares: bigint;
  pendingRewards: bigint;
  lockEnd: Date;
}

export interface StakingStats {
  totalStaked: bigint;
  totalShares: bigint;
  rewardRate: bigint;
  currentAPY: number;
}
