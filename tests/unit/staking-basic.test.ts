import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MorpheusStaking } from '../../packages/contracts/src/staking/morpheus.js';
import { createTestWallet, CONTRACTS, TEST_ACCOUNTS } from '../setup/fork.js';
import { mintMOR, getMORBalance, formatMOR, parseMOR } from '../helpers/tokens.js';

// Mock the Akash client (not needed for staking tests, but good practice)
vi.mock('../../packages/contracts/src/akash/client.js');

describe('MorpheusStaking - Basic Tests', () => {
  let staking: MorpheusStaking;
  let testAccount: `0x${string}`;

  beforeEach(async () => {
    testAccount = TEST_ACCOUNTS[0].address;

    // Initialize staking client with testnet config
    staking = new MorpheusStaking(
      {
        network: 'testnet',
        rpcUrl: 'http://127.0.0.1:8545', // Use local fork
      },
      TEST_ACCOUNTS[0].privateKey
    );

    // Mint some MOR tokens for testing
    await mintMOR(testAccount, '1000');
  });

  describe('Initialization', () => {
    it('should connect to forked Base Sepolia', async () => {
      const total = await staking.getTotalStaked();
      expect(total).toBeDefined();
      expect(typeof total).toBe('bigint');
    });

    it('should reject mainnet when subnet ID is not configured', () => {
      expect(() => {
        new MorpheusStaking(
          {
            network: 'mainnet',
          },
          TEST_ACCOUNTS[0].privateKey
        );
      }).toThrow('Mainnet subnet ID is not yet configured');
    });
  });

  describe('Balance and Position Queries', () => {
    it('should check MOR balance after minting', async () => {
      const balance = await getMORBalance(testAccount);
      const formatted = formatMOR(balance);

      expect(balance).toBeGreaterThan(0n);
      expect(formatted).toBe('1000.0');
    });

    it('should get initial position (should be zero)', async () => {
      const position = await staking.getPosition(testAccount);

      expect(position.amount).toBe(0n);
      expect(position.shares).toBe(0n);
      expect(position.rewards).toBe(0n); // Always 0 in Builders V4
    });

    it('should get total staked in subnet', async () => {
      const total = await staking.getTotalStaked();
      expect(total).toBeGreaterThanOrEqual(0n);
    });
  });

  describe('Share Conversion (1:1 in Builders V4)', () => {
    it('should convert shares to MOR (1:1)', async () => {
      const shares = parseMOR('100');
      const mor = await staking.sharesToMOR(shares);

      expect(mor).toBe(shares);
      expect(formatMOR(mor)).toBe('100.0');
    });

    it('should maintain 1:1 ratio for any amount', async () => {
      const amounts = ['1', '10', '100', '1000', '10000'];

      for (const amount of amounts) {
        const input = parseMOR(amount);
        const output = await staking.sharesToMOR(input);
        expect(output).toBe(input);
      }
    });
  });

  describe('Deprecated Methods', () => {
    it('should throw error on claimRewards()', async () => {
      await expect(staking.claimRewards()).rejects.toThrow(
        'claimRewards is not available in Builders V4'
      );
    });

    it('should throw error on getAPY()', async () => {
      await expect(staking.getAPY()).rejects.toThrow(
        'getAPY is not available in Builders V4'
      );
    });
  });

  describe('Staking Position Fields', () => {
    it('should have rewards always equal to 0n', async () => {
      const position = await staking.getPosition(testAccount);
      expect(position.rewards).toBe(0n);
    });

    it('should have shares equal to amount (1:1)', async () => {
      const position = await staking.getPosition(testAccount);
      // For empty position
      expect(position.shares).toBe(position.amount);
    });
  });
});
