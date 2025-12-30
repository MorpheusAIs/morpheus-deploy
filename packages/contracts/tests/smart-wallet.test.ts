import { describe, it, expect, vi } from 'vitest';

import { SmartWalletManager } from '../src/wallet/smart-wallet';

// Mock viem
vi.mock('viem', () => ({
  createPublicClient: vi.fn().mockReturnValue({
    getBalance: vi.fn().mockResolvedValue(1000000000000000000n),
    getCode: vi.fn().mockResolvedValue('0x1234'),
    readContract: vi.fn().mockResolvedValue('0xabc123'),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({
      status: 'success',
      blockNumber: 12345n,
      gasUsed: 21000n,
    }),
  }),
  createWalletClient: vi.fn().mockReturnValue({
    sendTransaction: vi.fn().mockResolvedValue('0xtxhash123'),
    signMessage: vi.fn().mockResolvedValue('0xsignature'),
    writeContract: vi.fn().mockResolvedValue('0xapprove123'),
  }),
  http: vi.fn(),
}));

vi.mock('viem/chains', () => ({
  base: { id: 8453, name: 'Base' },
  baseSepolia: { id: 84532, name: 'Base Sepolia' },
}));

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn().mockReturnValue({
    address: '0x1234567890123456789012345678901234567890',
    publicKey: '0xpubkey',
  }),
}));

describe('SmartWalletManager', () => {
  describe('constructor', () => {
    it('should create instance for mainnet', () => {
      const manager = new SmartWalletManager({ network: 'mainnet' });
      expect(manager).toBeDefined();
    });

    it('should create instance for testnet', () => {
      const manager = new SmartWalletManager({ network: 'testnet' });
      expect(manager).toBeDefined();
    });
  });

  describe('createSmartWallet', () => {
    it('should create a smart wallet', async () => {
      const manager = new SmartWalletManager({ network: 'testnet' });
      const wallet = await manager.createSmartWallet();

      expect(wallet).toBeDefined();
      expect(wallet.address).toBeDefined();
      expect(wallet.isSmartWallet).toBe(true);
      expect(wallet.ownerPrivateKey).toBeDefined();
    });
  });

  describe('getWalletInfo', () => {
    it('should return wallet info', async () => {
      const manager = new SmartWalletManager({ network: 'testnet' });
      const info = await manager.getWalletInfo('0x1234567890123456789012345678901234567890');

      expect(info).toBeDefined();
      expect(info.address).toBe('0x1234567890123456789012345678901234567890');
    });
  });

  describe('getBalance', () => {
    it('should return ETH balance', async () => {
      const manager = new SmartWalletManager({ network: 'testnet' });
      const balance = await manager.getBalance(
        '0x1234567890123456789012345678901234567890',
        'ETH'
      );

      expect(typeof balance).toBe('bigint');
    });
  });

  describe('waitForTransaction', () => {
    it('should wait for transaction and return receipt', async () => {
      const manager = new SmartWalletManager({ network: 'testnet' });
      const receipt = await manager.waitForTransaction('0x123abc' as `0x${string}`);

      expect(receipt.status).toBe('success');
    });
  });
});
