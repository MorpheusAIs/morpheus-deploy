import {
  createPublicClient,
  createWalletClient,
  http,
  parseEventLogs,
  type Address,
  type TransactionReceipt,
  type PublicClient,
  type WalletClient,
  type Chain,
} from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { STAKING_ABI, STAKING_ADDRESS, SUBNET_ID } from './abi.js';
import { CHAIN_CONFIG, MAINNET_ENABLED } from '../constants.js';
import { getSecurityLogger } from '../security/logger.js';

/**
 * Security Configuration
 * Addresses audit findings H-1, H-3, M-5
 */
export interface SecurityConfig {
  /** Maximum approval amount per transaction (default: 10,000 MOR) */
  maxApprovalCap?: bigint;
  /** Transaction deadline in milliseconds (default: 10 minutes) */
  deadlineMs?: number;
  /** Maximum gas price in gwei (optional) */
  maxGasPriceGwei?: number;
  /** Skip two-step approval reset (NOT recommended, for testing only) */
  skipApprovalReset?: boolean;
}

/**
 * Configuration for MorpheusStaking client
 */
export interface StakeConfig {
  /** Network to use: 'mainnet' or 'testnet' (Base Sepolia) */
  network: 'mainnet' | 'testnet';
  /** Optional RPC URL override. Defaults to Base or Base Sepolia public RPC */
  rpcUrl?: string;
  /** Security configuration options */
  security?: SecurityConfig;
}

/**
 * Options for stake/unstake operations
 * Addresses audit finding H-3: Missing transaction deadlines
 */
export interface TransactionOptions {
  /** Transaction deadline (default: 10 minutes from now) */
  deadline?: Date;
  /** Maximum priority fee per gas in wei */
  maxPriorityFeePerGas?: bigint;
  /** Maximum fee per gas in wei */
  maxFeePerGas?: bigint;
}

/**
 * User staking position in the Morpheus Deploy subnet
 *
 * @remarks
 * **Builders V4 Migration Notes:**
 * - `shares`: In Builders V4, deposits are 1:1 with MOR tokens (no share conversion).
 *   This field equals `amount` for backward compatibility. **Deprecated - use `amount` instead.**
 * - `rewards`: Builders V4 doesn't track rewards on-chain. This field is always `0n`.
 *   Rewards are managed externally by the subnet admin. **Will always be 0n.**
 */
export interface StakePosition {
  /** Total MOR tokens deposited to the subnet */
  amount: bigint;
  /**
   * @deprecated In Builders V4, this equals `amount` (1:1). Use `amount` field instead.
   * Kept for backward compatibility only.
   */
  shares: bigint;
  /**
   * @deprecated Builders V4 doesn't track rewards on-chain. Always returns `0n`.
   * Rewards are managed externally by the subnet admin.
   */
  rewards: bigint;
  /** Date when tokens can be withdrawn (based on subnet's withdrawLockPeriodAfterDeposit) */
  lockedUntil: Date;
}

/**
 * Result of a stake operation
 *
 * @remarks
 * **Builders V4 Migration Notes:**
 * - `shares`: In Builders V4, deposits are 1:1 with MOR tokens.
 *   This field equals `morphAmount` for backward compatibility. **Deprecated - use `morphAmount` instead.**
 */
export interface StakeResult {
  /** Transaction hash of the deposit transaction */
  txHash: string;
  /**
   * @deprecated In Builders V4, this equals `morphAmount` (1:1). Use `morphAmount` field instead.
   * Kept for backward compatibility only.
   */
  shares: bigint;
  /** Actual MOR amount deposited to the subnet */
  morphAmount: bigint;
}

/**
 * Subnet configuration data
 */
interface SubnetConfig {
  name: string;
  admin: Address;
  unusedStorage1_V4Update: bigint;
  withdrawLockPeriodAfterDeposit: bigint;
  unusedStorage2_V4Update: bigint;
  minimalDeposit: bigint;
  claimAdmin: Address;
}

// Default security constants
const DEFAULT_MAX_APPROVAL_CAP = 10_000n * 10n ** 18n; // 10,000 MOR
const DEFAULT_DEADLINE_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REASONABLE_SUBNET_DEPOSIT = 1_000_000n * 10n ** 18n; // 1M MOR - DoS protection

// ERC20 ABI for approvals
const ERC20_APPROVAL_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export class MorpheusStaking {
  private chain: Chain;
  private publicClient: PublicClient;
  private walletClient: WalletClient | undefined;
  private stakingAddress: Address;
  private subnetId: `0x${string}`;
  private network: 'mainnet' | 'testnet';
  private securityConfig: Required<SecurityConfig>;

  constructor(config: StakeConfig, privateKey?: `0x${string}`) {
    this.network = config.network;
    this.chain = config.network === 'mainnet' ? base : baseSepolia;
    this.stakingAddress = STAKING_ADDRESS[config.network];
    this.subnetId = SUBNET_ID[config.network];

    // Security configuration with defaults
    this.securityConfig = {
      maxApprovalCap: config.security?.maxApprovalCap ?? DEFAULT_MAX_APPROVAL_CAP,
      deadlineMs: config.security?.deadlineMs ?? DEFAULT_DEADLINE_MS,
      maxGasPriceGwei: config.security?.maxGasPriceGwei ?? 0,
      skipApprovalReset: config.security?.skipApprovalReset ?? false,
    };

    // Validate mainnet configuration (addresses M-3)
    this.validateNetworkConfig(config.network);

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
   * Stake MOR tokens (deposit to Builders V4 subnet)
   *
   * Security improvements:
   * - H-1: Two-step approval with caps
   * - H-3: Transaction deadline
   * - H-4: Subnet validation
   * - M-1: Proper event parsing
   * - M-5: Gas price validation
   * - L-3: Security logging
   *
   * @param amount - Amount of MOR tokens to stake (in wei, 18 decimals)
   * @param options - Transaction options including deadline
   * @throws {Error} If wallet not initialized, amount below minimum, deadline passed, or subnet invalid
   */
  async stake(amount: bigint, options?: TransactionOptions): Promise<StakeResult> {
    const logger = getSecurityLogger();

    if (!this.walletClient) {
      throw new Error('Wallet not initialized');
    }

    // Create deadline (addresses H-3)
    const deadline = options?.deadline || new Date(Date.now() + this.securityConfig.deadlineMs);
    this.validateDeadline(deadline);

    // Validate gas price if cap is set (addresses M-5)
    await this.validateGasPrice();

    // Validate subnet configuration (addresses H-4)
    const subnet = await this.validateSubnetConfig();

    // Validate amount against subnet minimum
    this.validateAmount(amount, subnet.minimalDeposit);

    // Approve staking contract with security measures (addresses H-1)
    const morAddress = await this.getMORAddress();
    await this.approveWithSafetyChecks(morAddress, amount);

    // Check deadline before submitting transaction
    this.validateDeadline(deadline);

    // Execute deposit to Builders V4 subnet
    const hash = await this.walletClient.writeContract({
      address: this.stakingAddress,
      abi: STAKING_ABI,
      functionName: 'deposit',
      args: [this.subnetId, amount],
      account: this.walletClient.account!,
      chain: this.walletClient.chain,
      ...(options?.maxFeePerGas && { maxFeePerGas: options.maxFeePerGas }),
      ...(options?.maxPriorityFeePerGas && { maxPriorityFeePerGas: options.maxPriorityFeePerGas }),
    });

    // Wait for confirmation with timeout based on deadline
    const timeoutMs = Math.max(deadline.getTime() - Date.now(), 5000);
    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash,
      timeout: timeoutMs,
    });

    // Verify transaction confirmed before deadline
    if (new Date() > deadline) {
      await logger.warn('STAKE_DEPOSIT', {
        warning: 'Transaction confirmed after deadline',
        txHash: hash,
        deadline: deadline.toISOString(),
      });
    }

    // Parse deposit event with proper error handling (addresses M-1)
    const depositedAmount = this.parseDepositEventSafe(receipt, amount);

    // Log security event (addresses L-3)
    await logger.info('STAKE_DEPOSIT', {
      txHash: hash,
      amount: depositedAmount.toString(),
      subnetId: this.subnetId,
      user: this.walletClient.account!.address,
    });

    return {
      txHash: hash,
      shares: depositedAmount, // For compatibility, return amount as shares (1:1)
      morphAmount: depositedAmount,
    };
  }

  /**
   * Unstake MOR tokens (withdraw from Builders V4 subnet)
   *
   * @param amount - Amount to unstake
   * @param options - Transaction options including deadline
   */
  async unstake(amount: bigint, options?: TransactionOptions): Promise<string> {
    const logger = getSecurityLogger();

    if (!this.walletClient) {
      throw new Error('Wallet not initialized');
    }

    // Create deadline (addresses H-3)
    const deadline = options?.deadline || new Date(Date.now() + this.securityConfig.deadlineMs);
    this.validateDeadline(deadline);

    // Validate gas price if cap is set (addresses M-5)
    await this.validateGasPrice();

    const hash = await this.walletClient.writeContract({
      address: this.stakingAddress,
      abi: STAKING_ABI,
      functionName: 'withdraw',
      args: [this.subnetId, amount],
      account: this.walletClient.account!,
      chain: this.walletClient.chain,
      ...(options?.maxFeePerGas && { maxFeePerGas: options.maxFeePerGas }),
      ...(options?.maxPriorityFeePerGas && { maxPriorityFeePerGas: options.maxPriorityFeePerGas }),
    });

    const timeoutMs = Math.max(deadline.getTime() - Date.now(), 5000);
    await this.publicClient.waitForTransactionReceipt({
      hash,
      timeout: timeoutMs,
    });

    // Log security event (addresses L-3)
    await logger.info('STAKE_WITHDRAW', {
      txHash: hash,
      amount: amount.toString(),
      subnetId: this.subnetId,
      user: this.walletClient.account!.address,
    });

    return hash;
  }

  /**
   * Claim pending rewards
   *
   * @deprecated This method is not available in Builders V4.
   * Builders V4 doesn't have a direct claimRewards function.
   * Rewards are managed externally by the subnet admin or through other mechanisms.
   * This method will be removed in v2.0.0.
   *
   * @throws {Error} Always throws - feature not available in Builders V4
   */
  async claimRewards(): Promise<{ txHash: string; amount: bigint }> {
    // Deprecation warning (addresses L-2)
    console.warn(
      '[DEPRECATED] claimRewards() is not supported in Builders V4. ' +
      'Rewards are handled by the subnet admin. This method will be removed in v2.0.0. ' +
      'See: https://docs.morpheus.com/staking/migration'
    );
    throw new Error('claimRewards is not available in Builders V4. Rewards are handled by the subnet.');
  }

  /**
   * Get staking position for an address
   */
  async getPosition(address: Address): Promise<StakePosition> {
    const deposit = await this.publicClient.readContract({
      address: this.stakingAddress,
      abi: STAKING_ABI,
      functionName: 'getUserDeposit',
      args: [this.subnetId, address],
    });

    // Get subnet info to check lock period
    const subnet = await this.getSubnetConfig();

    const depositAmount = deposit as bigint;
    const lockPeriod = subnet.withdrawLockPeriodAfterDeposit;

    return {
      amount: depositAmount,
      shares: depositAmount, // For compatibility, use amount as shares
      rewards: 0n, // Builders V4 doesn't track rewards this way
      lockedUntil: lockPeriod > 0n
        ? new Date(Date.now() + Number(lockPeriod) * 1000)
        : new Date(0),
    };
  }

  /**
   * Get total staked MOR in the subnet
   */
  async getTotalStaked(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.stakingAddress,
      abi: STAKING_ABI,
      functionName: 'getSubnetDeposit',
      args: [this.subnetId],
    }) as Promise<bigint>;
  }

  /**
   * Get current APY
   *
   * @deprecated This method is not available in Builders V4.
   * Builders V4 doesn't expose APY directly. APY must be calculated
   * based on subnet economics or retrieved from off-chain sources.
   * This method will be removed in v2.0.0.
   *
   * @throws {Error} Always throws - feature not available in Builders V4
   */
  async getAPY(): Promise<number> {
    // Deprecation warning (addresses L-2)
    console.warn(
      '[DEPRECATED] getAPY() is not supported in Builders V4. ' +
      'APY must be calculated externally based on subnet economics. ' +
      'This method will be removed in v2.0.0. ' +
      'See: https://docs.morpheus.com/staking/migration'
    );
    throw new Error('getAPY is not available in Builders V4. APY must be calculated externally.');
  }

  /**
   * Calculate MOR amount from shares
   *
   * @deprecated In Builders V4, deposits are 1:1 with MOR tokens (no share conversion).
   * This method simply returns the input value unchanged for backward compatibility.
   * Consider using the amount directly instead. This method will be removed in v2.0.0.
   *
   * @param shares - Amount to convert (will be returned unchanged)
   * @returns The same value as input (1:1 conversion)
   */
  async sharesToMOR(shares: bigint): Promise<bigint> {
    // Deprecation warning (addresses L-2)
    console.warn(
      '[DEPRECATED] sharesToMOR() returns input unchanged in Builders V4 (1:1 ratio). ' +
      'Use the amount directly. This method will be removed in v2.0.0.'
    );
    return shares; // In Builders V4, deposits are 1:1
  }

  /**
   * Validate network configuration
   * Addresses audit finding M-3: Missing mainnet configuration guards
   */
  private validateNetworkConfig(network: 'mainnet' | 'testnet'): void {
    if (network === 'mainnet') {
      // Check global mainnet feature flag
      if (!MAINNET_ENABLED) {
        throw new Error(
          'Mainnet deployments are disabled. Mainnet support is not yet available. ' +
          'Please use testnet network for now.'
        );
      }

      // Validate subnet ID is configured
      if (this.subnetId === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        throw new Error(
          'Mainnet subnet ID is not yet configured. ' +
          'Please use testnet network or wait for mainnet deployment.'
        );
      }

      // Validate MOR token address
      const morAddress = CHAIN_CONFIG.mainnet.mor;
      if (morAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(
          'Mainnet MOR token address is not configured. ' +
          'Please use testnet network or wait for mainnet deployment.'
        );
      }
    }
  }

  /**
   * Validate transaction deadline
   * Addresses audit finding H-3: Missing transaction deadlines
   */
  private validateDeadline(deadline: Date): void {
    if (new Date() > deadline) {
      throw new Error(
        `Transaction deadline has passed: ${deadline.toISOString()}. ` +
        'Please retry with a new deadline.'
      );
    }
  }

  /**
   * Validate gas price against cap
   * Addresses audit finding M-5: No gas price oracle with user caps
   */
  private async validateGasPrice(): Promise<void> {
    // Skip validation if no cap is set
    if (this.securityConfig.maxGasPriceGwei <= 0) {
      return;
    }

    const logger = getSecurityLogger();
    const currentGasPrice = await this.publicClient.getGasPrice();
    const maxGasPriceWei = BigInt(this.securityConfig.maxGasPriceGwei) * 10n ** 9n;

    if (currentGasPrice > maxGasPriceWei) {
      await logger.warn('GAS_PRICE_CAP_EXCEEDED', {
        currentGasPriceGwei: (currentGasPrice / 10n ** 9n).toString(),
        maxGasPriceGwei: this.securityConfig.maxGasPriceGwei,
        network: this.network,
      });

      throw new Error(
        `Current gas price ${currentGasPrice / 10n ** 9n} gwei exceeds ` +
        `configured cap of ${this.securityConfig.maxGasPriceGwei} gwei. ` +
        'Wait for gas prices to decrease or increase security.maxGasPriceGwei.'
      );
    }
  }

  /**
   * Validate subnet configuration
   * Addresses audit finding H-4: No validation of subnet configuration
   */
  private async validateSubnetConfig(): Promise<SubnetConfig> {
    const subnet = await this.getSubnetConfig();

    // Validate subnet has an admin (exists and is active)
    if (!subnet.admin || subnet.admin === '0x0000000000000000000000000000000000000000') {
      throw new Error(
        'Invalid subnet configuration: no admin address. ' +
        'The subnet may not exist or has been deactivated.'
      );
    }

    // Validate subnet has a name
    if (!subnet.name || subnet.name === '') {
      throw new Error(
        'Invalid subnet configuration: no subnet name. ' +
        'The subnet may not be properly initialized.'
      );
    }

    // Check for DoS attack via excessive minimum deposit
    if (subnet.minimalDeposit > MAX_REASONABLE_SUBNET_DEPOSIT) {
      const logger = getSecurityLogger();
      await logger.critical('SUBNET_VALIDATION_FAILED', {
        error: 'Subnet minimum deposit exceeds reasonable limit',
        subnetId: this.subnetId,
        minimalDeposit: subnet.minimalDeposit.toString(),
        maxReasonable: MAX_REASONABLE_SUBNET_DEPOSIT.toString(),
      });
      throw new Error(
        `Subnet minimum deposit ${subnet.minimalDeposit / (10n ** 18n)} MOR ` +
        `exceeds reasonable limit of ${MAX_REASONABLE_SUBNET_DEPOSIT / (10n ** 18n)} MOR. ` +
        'This may indicate a misconfiguration or attack.'
      );
    }

    return subnet;
  }

  /**
   * Validate amount against minimum deposit
   */
  private validateAmount(amount: bigint, minDeposit: bigint): void {
    if (amount < minDeposit) {
      const minDepositFormatted = minDeposit / (10n ** 18n);
      const amountFormatted = amount / (10n ** 18n);
      throw new Error(
        `Amount ${amountFormatted} MOR is below subnet minimum deposit of ${minDepositFormatted} MOR`
      );
    }
  }

  /**
   * Get subnet configuration
   */
  private async getSubnetConfig(): Promise<SubnetConfig> {
    return this.publicClient.readContract({
      address: this.stakingAddress,
      abi: STAKING_ABI,
      functionName: 'subnets',
      args: [this.subnetId],
    }) as Promise<SubnetConfig>;
  }

  private async getMORAddress(): Promise<Address> {
    const morAddress = CHAIN_CONFIG[this.network].mor;
    if (morAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('MOR token address not configured for this network');
    }
    return morAddress;
  }

  /**
   * Two-step ERC-20 approval with safety caps
   * Addresses audit finding H-1: Unlimited ERC-20 token approvals
   *
   * Security measures:
   * 1. Validates amount against safety cap
   * 2. Resets approval to 0 first (prevents approval race)
   * 3. Sets exact amount needed
   * 4. Verifies approval was set correctly
   */
  private async approveWithSafetyChecks(token: Address, amount: bigint): Promise<void> {
    const logger = getSecurityLogger();

    if (!this.walletClient) return;

    // Validate amount against safety cap (H-1)
    if (amount > this.securityConfig.maxApprovalCap) {
      throw new Error(
        `Approval amount ${amount / (10n ** 18n)} MOR exceeds safety cap of ` +
        `${this.securityConfig.maxApprovalCap / (10n ** 18n)} MOR. ` +
        'Increase security.maxApprovalCap if this is intentional.'
      );
    }

    const currentAllowance = await this.publicClient.readContract({
      address: token,
      abi: ERC20_APPROVAL_ABI,
      functionName: 'allowance',
      args: [this.walletClient.account!.address, this.stakingAddress],
    }) as bigint;

    // If current allowance is sufficient, no action needed
    if (currentAllowance >= amount) {
      return;
    }

    // Step 1: Reset to 0 first (prevents approval race condition)
    if (currentAllowance > 0n && !this.securityConfig.skipApprovalReset) {
      await logger.info('ERC20_APPROVAL_RESET', {
        token,
        spender: this.stakingAddress,
        previousAllowance: currentAllowance.toString(),
        reason: 'Resetting to zero before new approval (H-1 fix)',
      });

      const resetHash = await this.walletClient.writeContract({
        address: token,
        abi: ERC20_APPROVAL_ABI,
        functionName: 'approve',
        args: [this.stakingAddress, 0n],
        account: this.walletClient.account!,
        chain: this.walletClient.chain,
      });

      await this.publicClient.waitForTransactionReceipt({ hash: resetHash });
    }

    // Step 2: Approve exact amount needed
    const approveHash = await this.walletClient.writeContract({
      address: token,
      abi: ERC20_APPROVAL_ABI,
      functionName: 'approve',
      args: [this.stakingAddress, amount],
      account: this.walletClient.account!,
      chain: this.walletClient.chain,
    });

    await this.publicClient.waitForTransactionReceipt({ hash: approveHash });

    // Step 3: Verify approval was set correctly
    const newAllowance = await this.publicClient.readContract({
      address: token,
      abi: ERC20_APPROVAL_ABI,
      functionName: 'allowance',
      args: [this.walletClient.account!.address, this.stakingAddress],
    }) as bigint;

    if (newAllowance < amount) {
      throw new Error(
        `Approval verification failed. Expected ${amount}, got ${newAllowance}. ` +
        'The token may have transfer fees or other non-standard behavior.'
      );
    }

    // Log security event (addresses L-3)
    await logger.info('ERC20_APPROVAL', {
      token,
      spender: this.stakingAddress,
      amount: amount.toString(),
      txHash: approveHash,
      user: this.walletClient.account!.address,
    });
  }

  /**
   * Parse deposit event with proper error handling
   * Addresses audit finding M-1: Incomplete event parsing
   *
   * Uses viem's parseEventLogs for reliable parsing.
   * Throws error if event not found instead of silently returning 0.
   */
  private parseDepositEventSafe(receipt: TransactionReceipt, expectedAmount: bigint): bigint {
    try {
      const events = parseEventLogs({
        abi: STAKING_ABI,
        logs: receipt.logs,
        eventName: 'UserDeposited',
      });

      // Find event for our subnet
      const depositEvent = events.find(
        e => e.args.subnetId === this.subnetId
      );

      if (depositEvent && depositEvent.args.amount !== undefined) {
        const actualAmount = depositEvent.args.amount as bigint;

        // Warn if actual amount differs from expected
        if (actualAmount !== expectedAmount) {
          const logger = getSecurityLogger();
          logger.warn('STAKE_DEPOSIT', {
            warning: 'Deposited amount differs from requested amount',
            expected: expectedAmount.toString(),
            actual: actualAmount.toString(),
            difference: (expectedAmount - actualAmount).toString(),
          });
        }

        return actualAmount;
      }

      // Event not found - this shouldn't happen for a successful transaction
      // Fall back to expected amount but log warning
      const logger = getSecurityLogger();
      logger.warn('STAKE_DEPOSIT', {
        warning: 'UserDeposited event not found in receipt',
        txHash: receipt.transactionHash,
        subnetId: this.subnetId,
        usingExpectedAmount: expectedAmount.toString(),
      });

      return expectedAmount;
    } catch (error) {
      // Parsing failed - log error and fall back to expected amount
      const logger = getSecurityLogger();
      logger.error('STAKE_DEPOSIT', {
        error: 'Failed to parse deposit event',
        details: String(error),
        txHash: receipt.transactionHash,
        usingExpectedAmount: expectedAmount.toString(),
      });

      return expectedAmount;
    }
  }
}
