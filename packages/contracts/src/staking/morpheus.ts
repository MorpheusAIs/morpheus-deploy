import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { STAKING_ABI, STAKING_ADDRESS } from './abi.js';

export interface StakeConfig {
  network: 'mainnet' | 'testnet';
  rpcUrl?: string;
}

export interface StakePosition {
  amount: bigint;
  shares: bigint;
  rewards: bigint;
  lockedUntil: Date;
}

export interface StakeResult {
  txHash: string;
  shares: bigint;
  morphAmount: bigint;
}

export class MorpheusStaking {
  private chain;
  private publicClient;
  private walletClient;
  private stakingAddress: Address;

  constructor(config: StakeConfig, privateKey?: `0x${string}`) {
    this.chain = config.network === 'mainnet' ? base : baseSepolia;
    this.stakingAddress = STAKING_ADDRESS[config.network];

    const rpcUrl = config.rpcUrl || (config.network === 'mainnet'
      ? 'https://mainnet.base.org'
      : 'https://sepolia.base.org');

    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(rpcUrl),
    });

    if (privateKey) {
      const account = privateKeyToAccount(privateKey);
      this.walletClient = createWalletClient({
        account,
        chain: this.chain,
        transport: http(rpcUrl),
      });
    }
  }

  /**
   * Stake MOR tokens
   */
  async stake(amount: bigint): Promise<StakeResult> {
    if (!this.walletClient) {
      throw new Error('Wallet not initialized');
    }

    // Approve staking contract to spend MOR
    const morAddress = await this.getMORAddress();
    await this.approveIfNeeded(morAddress, amount);

    // Execute stake
    const hash = await this.walletClient.writeContract({
      address: this.stakingAddress,
      abi: STAKING_ABI,
      functionName: 'stake',
      args: [amount],
    });

    // Wait for confirmation
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    // Parse stake event to get shares
    const shares = this.parseStakeEvent(receipt);

    return {
      txHash: hash,
      shares,
      morphAmount: amount,
    };
  }

  /**
   * Unstake MOR tokens
   */
  async unstake(shares: bigint): Promise<string> {
    if (!this.walletClient) {
      throw new Error('Wallet not initialized');
    }

    const hash = await this.walletClient.writeContract({
      address: this.stakingAddress,
      abi: STAKING_ABI,
      functionName: 'unstake',
      args: [shares],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    return hash;
  }

  /**
   * Claim pending rewards
   */
  async claimRewards(): Promise<{ txHash: string; amount: bigint }> {
    if (!this.walletClient) {
      throw new Error('Wallet not initialized');
    }

    const hash = await this.walletClient.writeContract({
      address: this.stakingAddress,
      abi: STAKING_ABI,
      functionName: 'claimRewards',
      args: [],
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    const amount = this.parseRewardEvent(receipt);

    return { txHash: hash, amount };
  }

  /**
   * Get staking position for an address
   */
  async getPosition(address: Address): Promise<StakePosition> {
    const [amount, shares, rewards, lockedUntil] = await Promise.all([
      this.publicClient.readContract({
        address: this.stakingAddress,
        abi: STAKING_ABI,
        functionName: 'stakedAmount',
        args: [address],
      }),
      this.publicClient.readContract({
        address: this.stakingAddress,
        abi: STAKING_ABI,
        functionName: 'shares',
        args: [address],
      }),
      this.publicClient.readContract({
        address: this.stakingAddress,
        abi: STAKING_ABI,
        functionName: 'pendingRewards',
        args: [address],
      }),
      this.publicClient.readContract({
        address: this.stakingAddress,
        abi: STAKING_ABI,
        functionName: 'lockEnd',
        args: [address],
      }),
    ]);

    return {
      amount: amount as bigint,
      shares: shares as bigint,
      rewards: rewards as bigint,
      lockedUntil: new Date(Number(lockedUntil as bigint) * 1000),
    };
  }

  /**
   * Get total staked MOR
   */
  async getTotalStaked(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.stakingAddress,
      abi: STAKING_ABI,
      functionName: 'totalStaked',
      args: [],
    }) as Promise<bigint>;
  }

  /**
   * Get current APY
   */
  async getAPY(): Promise<number> {
    const apy = await this.publicClient.readContract({
      address: this.stakingAddress,
      abi: STAKING_ABI,
      functionName: 'currentAPY',
      args: [],
    }) as bigint;

    // Convert from basis points to percentage
    return Number(apy) / 100;
  }

  /**
   * Calculate MOR amount from shares
   */
  async sharesToMOR(shares: bigint): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.stakingAddress,
      abi: STAKING_ABI,
      functionName: 'sharesToMOR',
      args: [shares],
    }) as Promise<bigint>;
  }

  private async getMORAddress(): Promise<Address> {
    return this.publicClient.readContract({
      address: this.stakingAddress,
      abi: STAKING_ABI,
      functionName: 'morToken',
      args: [],
    }) as Promise<Address>;
  }

  private async approveIfNeeded(token: Address, amount: bigint): Promise<void> {
    if (!this.walletClient) return;

    const allowance = await this.publicClient.readContract({
      address: token,
      abi: [{
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
      }],
      functionName: 'allowance',
      args: [this.walletClient.account!.address, this.stakingAddress],
    }) as bigint;

    if (allowance < amount) {
      const hash = await this.walletClient.writeContract({
        address: token,
        abi: [{
          name: 'approve',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ name: '', type: 'bool' }],
        }],
        functionName: 'approve',
        args: [this.stakingAddress, amount],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });
    }
  }

  private parseStakeEvent(_receipt: unknown): bigint {
    // Parse Staked event from receipt logs
    // In production, would decode the actual event
    return 0n;
  }

  private parseRewardEvent(_receipt: unknown): bigint {
    // Parse RewardsClaimed event from receipt logs
    return 0n;
  }
}
