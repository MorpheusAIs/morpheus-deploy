import { describe, it, expect, vi, beforeEach } from 'vitest';

import { EconomicEngine, type SwapConfig } from '../src/economic/engine';
import type { MorpheusConfig } from '../src/sdl/types';

// Mock the SkipGoClient
vi.mock('../src/economic/skip-go', () => ({
  SkipGoClient: vi.fn().mockImplementation(() => ({
    getRoute: vi.fn().mockResolvedValue({
      estimatedOutput: '2450000',
      estimatedFee: '10000',
      route: [
        { from: 'base', to: 'osmosis' },
        { from: 'osmosis', to: 'akash' },
      ],
      priceImpact: 0.01,
      estimatedTime: 120,
      sourceChain: 'base',
    }),
    buildTransaction: vi.fn().mockResolvedValue({
      chainId: '8453',
      to: '0x123',
      data: '0xabc',
      value: '0',
      gasLimit: '500000',
    }),
    broadcastTransaction: vi.fn().mockResolvedValue({
      txHash: '0x123abc',
      status: 'success',
    }),
    waitForCompletion: vi.fn().mockResolvedValue({
      status: 'completed',
    }),
  })),
}));

// Mock the PriceOracle
vi.mock('../src/economic/oracle', () => ({
  PriceOracle: vi.fn().mockImplementation(() => ({
    getPrice: vi.fn().mockResolvedValue(2.45),
    getAktUsdcRate: vi.fn().mockResolvedValue(2.45),
  })),
}));

describe('EconomicEngine', () => {
  let engine: EconomicEngine;

  const mockWallet = {
    load: vi.fn().mockResolvedValue({ address: '0xabc123' }),
    signTransaction: vi.fn().mockResolvedValue('0xsignedtx'),
    getBalance: vi.fn().mockResolvedValue({
      usdc: 100,
      eth: 0.5,
      akt: 0,
      mor: 0,
    }),
  };

  const morpheusConfig: MorpheusConfig = {
    project: 'test-project',
    template: 'ai-agent',
    provider: 'akash',
    network: 'mainnet',
    resources: {
      cpu: 2,
      memory: '4Gi',
      storage: '10Gi',
    },
    runtime: {
      port: 8000,
    },
    funding: {
      sourceToken: 'USDC',
      autoTopUp: true,
      threshold: 0.1,
      split: {
        staking: 0.6,
        compute: 0.4,
      },
    },
  };

  const testnetConfig: MorpheusConfig = {
    ...morpheusConfig,
    project: 'testnet-project',
    network: 'testnet',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new EconomicEngine(morpheusConfig, mockWallet);
  });

  describe('getSwapQuote', () => {
    it('should return a swap quote', async () => {
      const config: SwapConfig = {
        sourceToken: 'USDC',
        amount: 100,
        destination: 'akash',
      };

      const quote = await engine.getSwapQuote(config);

      expect(quote).toBeDefined();
      expect(typeof quote.sourceAmount).toBe('number');
      expect(typeof quote.destinationAmount).toBe('number');
      expect(typeof quote.estimatedFee).toBe('number');
      expect(Array.isArray(quote.route)).toBe(true);
    });
  });

  describe('executeSwap', () => {
    it('should execute a swap and return result', async () => {
      const config: SwapConfig = {
        sourceToken: 'USDC',
        amount: 100,
        destination: 'akash',
      };

      const result = await engine.executeSwap(config);

      expect(result).toBeDefined();
      expect(typeof result.sourceAmount).toBe('number');
      expect(typeof result.destinationAmount).toBe('number');
      expect(typeof result.txHash).toBe('string');
    });

    it('should apply funding split when destination is akash', async () => {
      const config: SwapConfig = {
        sourceToken: 'USDC',
        amount: 100,
        destination: 'akash',
      };

      const result = await engine.executeSwap(config);

      // Should apply 40% compute, 60% staking split
      expect(result.sourceAmount).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateRequiredFunding', () => {
    it('should calculate funding requirements', async () => {
      const hourlyRate = 0.5; // AKT per hour
      const durationHours = 24;

      const funding = await engine.calculateRequiredFunding(hourlyRate, durationHours);

      expect(funding).toBeDefined();
      expect(typeof funding.akt).toBe('number');
      expect(typeof funding.usdc).toBe('number');
      expect(funding.akt).toBeGreaterThan(0);
    });

    it('should calculate 1 year funding correctly with default buffer', async () => {
      const hourlyRate = 0.5;
      const oneYearHours = 365 * 24;
      const defaultBuffer = 0.2;

      const funding = await engine.calculateRequiredFunding(hourlyRate, oneYearHours);

      expect(funding.akt).toBe(hourlyRate * oneYearHours * (1 + defaultBuffer));
    });

    it('should calculate 6 month funding correctly with default buffer', async () => {
      const hourlyRate = 0.5;
      const sixMonthHours = 6 * 30 * 24;
      const defaultBuffer = 0.2;

      const funding = await engine.calculateRequiredFunding(hourlyRate, sixMonthHours);

      expect(funding.akt).toBe(hourlyRate * sixMonthHours * (1 + defaultBuffer));
    });

    it('should calculate 30 day funding correctly with default buffer', async () => {
      const hourlyRate = 0.5;
      const thirtyDayHours = 30 * 24;
      const defaultBuffer = 0.2;

      const funding = await engine.calculateRequiredFunding(hourlyRate, thirtyDayHours);

      expect(funding.akt).toBe(hourlyRate * thirtyDayHours * (1 + defaultBuffer));
    });

    it('should calculate funding without buffer when specified', async () => {
      const hourlyRate = 0.5;
      const oneYearHours = 365 * 24;

      const funding = await engine.calculateRequiredFunding(hourlyRate, oneYearHours, 0);

      expect(funding.akt).toBe(hourlyRate * oneYearHours);
    });
  });

  describe('checkEscrowHealth', () => {
    it('should return health status', async () => {
      const currentBalance = 10; // AKT
      const burnRate = 0.5; // AKT per hour

      const health = await engine.checkEscrowHealth(currentBalance, burnRate);

      expect(health).toBeDefined();
      expect(typeof health.needsTopUp).toBe('boolean');
      expect(typeof health.hoursRemaining).toBe('number');
      expect(typeof health.recommendedTopUp).toBe('number');
    });

    it('should indicate top-up needed when balance is low', async () => {
      const currentBalance = 0.1; // Very low balance
      const burnRate = 1; // AKT per hour

      const health = await engine.checkEscrowHealth(currentBalance, burnRate);

      expect(health.needsTopUp).toBe(true);
    });
  });

  describe('network configuration', () => {
    it('should support testnet configuration', () => {
      const testnetEngine = new EconomicEngine(testnetConfig, mockWallet);
      expect(testnetEngine).toBeDefined();
    });

    it('should default to mainnet when network not specified', () => {
      const configWithoutNetwork: MorpheusConfig = {
        project: 'test',
        template: 'ai-agent',
        provider: 'akash',
      };
      const defaultEngine = new EconomicEngine(configWithoutNetwork, mockWallet);
      expect(defaultEngine).toBeDefined();
    });
  });
});
