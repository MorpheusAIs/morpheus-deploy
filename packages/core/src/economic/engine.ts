import { SkipGoClient, type RouteResponse } from './skip-go.js';
import { PriceOracle } from './oracle.js';
import type { MorpheusConfig } from '../sdl/types.js';
import { STAKING_ADDRESS } from '@morpheus-deploy/contracts';

export interface SwapConfig {
  sourceToken: string;
  amount: number;
  destination: 'akash' | 'morpheus';
  dseq?: string;
}

export interface SwapResult {
  sourceAmount: number;
  destinationAmount: number;
  txHash: string;
  route: string[];
  fees: number;
}

export interface SwapQuote {
  sourceAmount: number;
  destinationAmount: number;
  estimatedFee: number;
  route: string[];
  priceImpact: number;
  estimatedTime: number; // seconds
}

interface WalletManager {
  load(): Promise<{ address: string }>;
  signTransaction(tx: unknown): Promise<string>;
  getBalance(): Promise<{ usdc: number; eth: number; akt: number; mor: number }>;
}

export class EconomicEngine {
  private config: MorpheusConfig;
  private wallet: WalletManager;
  private skipGo: SkipGoClient;
  private oracle: PriceOracle;

  constructor(config: MorpheusConfig, wallet: WalletManager) {
    this.config = config;
    this.wallet = wallet;
    this.skipGo = new SkipGoClient({ network: config.network || 'mainnet' });
    this.oracle = new PriceOracle();
  }

  /**
   * Get a swap quote without executing
   */
  async getSwapQuote(options: SwapConfig): Promise<SwapQuote> {
    const route = await this.skipGo.getRoute({
      sourceChain: 'base',
      sourceToken: options.sourceToken,
      destChain: options.destination === 'akash' ? 'akash' : 'base',
      destToken: options.destination === 'akash' ? 'AKT' : 'MOR',
      amount: this.toBaseUnits(options.amount, 6),
    });

    return {
      sourceAmount: options.amount,
      destinationAmount: this.fromBaseUnits(route.estimatedOutput, 6),
      estimatedFee: this.fromBaseUnits(route.estimatedFee, 6),
      route: route.route.map(hop => `${hop.from} -> ${hop.to}`),
      priceImpact: route.priceImpact,
      estimatedTime: route.estimatedTime,
    };
  }

  /**
   * Execute a cross-chain swap using Skip Go
   */
  async executeSwap(options: SwapConfig): Promise<SwapResult> {
    // Apply funding split if configured
    let computeAmount = options.amount;
    let stakingAmount = 0;

    if (this.config.funding?.split && options.destination === 'akash') {
      const split = this.config.funding.split;
      computeAmount = options.amount * split.compute;
      stakingAmount = options.amount * split.staking;
    }

    // Get route for compute funds (USDC -> AKT)
    const computeRoute = await this.skipGo.getRoute({
      sourceChain: 'base',
      sourceToken: options.sourceToken,
      destChain: 'akash',
      destToken: 'AKT',
      amount: this.toBaseUnits(computeAmount, 6),
      smartRelay: true,
      postRouteAction: options.dseq ? {
        type: 'MsgDeposit',
        dseq: options.dseq,
      } : undefined,
    });

    // Execute the compute swap
    const computeTx = await this.executeRoute(computeRoute);

    // If there's a staking portion, execute that too
    if (stakingAmount > 0) {
      await this.executeStakingSwap(stakingAmount, options.sourceToken);
    }

    return {
      sourceAmount: options.amount,
      destinationAmount: this.fromBaseUnits(computeRoute.estimatedOutput, 6),
      txHash: computeTx.hash,
      route: computeRoute.route.map(hop => hop.to),
      fees: this.fromBaseUnits(computeRoute.estimatedFee, 6),
    };
  }

  /**
   * Execute staking swap (USDC -> MOR -> Stake)
   */
  private async executeStakingSwap(amount: number, sourceToken: string): Promise<void> {
    // Get route for staking (USDC -> MOR)
    const stakingRoute = await this.skipGo.getRoute({
      sourceChain: 'base',
      sourceToken,
      destChain: 'base', // MOR is on Base
      destToken: 'MOR',
      amount: this.toBaseUnits(amount, 6),
      smartRelay: true,
      postRouteAction: {
        type: 'Stake',
        contract: this.getMorpheusStakingContract(),
      },
    });

    await this.executeRoute(stakingRoute);
  }

  /**
   * Execute a route transaction
   */
  private async executeRoute(route: RouteResponse): Promise<{ hash: string }> {
    // Build the transaction
    const tx = await this.skipGo.buildTransaction(route);

    // Sign with wallet
    const signature = await this.wallet.signTransaction(tx);

    // Broadcast
    const result = await this.skipGo.broadcastTransaction(signature, route.sourceChain);

    // Wait for completion across all chains
    await this.skipGo.waitForCompletion(result.txHash, route);

    return { hash: result.txHash };
  }

  /**
   * Calculate required AKT for a deployment duration
   */
  async calculateRequiredFunding(
    hourlyRate: number,
    durationHours: number,
    buffer = 0.2
  ): Promise<{ akt: number; usdc: number }> {
    const totalAkt = hourlyRate * durationHours * (1 + buffer);
    const aktPrice = await this.oracle.getPrice('AKT', 'USDC');

    return {
      akt: totalAkt,
      usdc: totalAkt * aktPrice,
    };
  }

  /**
   * Check if escrow needs top-up based on threshold
   */
  async checkEscrowHealth(
    currentBalance: number,
    burnRate: number
  ): Promise<{ needsTopUp: boolean; hoursRemaining: number; recommendedTopUp: number }> {
    const threshold = this.config.funding?.threshold || 0.1;
    const hoursRemaining = burnRate > 0 ? currentBalance / burnRate : Infinity;

    // Calculate what 10% of a week's worth would be
    const weeklyBurn = burnRate * 24 * 7;
    const thresholdBalance = weeklyBurn * threshold;

    const needsTopUp = currentBalance < thresholdBalance;
    const recommendedTopUp = needsTopUp ? weeklyBurn - currentBalance : 0;

    return {
      needsTopUp,
      hoursRemaining,
      recommendedTopUp,
    };
  }

  /**
   * Auto top-up deployment escrow (Gas Station functionality)
   */
  async autoTopUp(dseq: string, escrowBalance: number, burnRate: number): Promise<SwapResult | null> {
    const health = await this.checkEscrowHealth(escrowBalance, burnRate);

    if (!health.needsTopUp || !this.config.funding?.autoTopUp) {
      return null;
    }

    // Calculate USDC needed
    const aktPrice = await this.oracle.getPrice('AKT', 'USDC');
    const usdcNeeded = health.recommendedTopUp * aktPrice;

    // Check wallet balance
    const balance = await this.wallet.getBalance();
    if (balance.usdc < usdcNeeded) {
      throw new Error(`Insufficient balance for auto top-up. Need $${usdcNeeded.toFixed(2)} USDC`);
    }

    // Execute swap with dseq for automatic escrow deposit
    return this.executeSwap({
      sourceToken: this.config.funding.sourceToken,
      amount: usdcNeeded,
      destination: 'akash',
      dseq,
    });
  }

  private getMorpheusStakingContract(): string {
    const network = this.config.network || 'mainnet';
    return STAKING_ADDRESS[network];
  }

  private toBaseUnits(amount: number, decimals: number): string {
    return Math.floor(amount * Math.pow(10, decimals)).toString();
  }

  private fromBaseUnits(amount: string, decimals: number): number {
    return parseInt(amount, 10) / Math.pow(10, decimals);
  }
}
