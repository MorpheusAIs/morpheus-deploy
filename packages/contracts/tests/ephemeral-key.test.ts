import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EphemeralKeyManager } from '../src/wallet/ephemeral-key';

// Mock viem/accounts
vi.mock('viem/accounts', () => {
  let callCount = 0;
  return {
    generatePrivateKey: vi.fn().mockImplementation(() => {
      callCount++;
      return `0x${'a'.repeat(63)}${callCount}`;
    }),
    privateKeyToAccount: vi.fn().mockImplementation((privateKey: string) => ({
      address: `0x${'1'.repeat(40)}`,
      publicKey: `0x${'2'.repeat(64)}`,
    })),
  };
});

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(JSON.stringify({
    address: '0x1111111111111111111111111111111111111111',
    publicKey: '0x' + '2'.repeat(64),
    encryptedPrivateKey: 'encrypted',
    salt: 'salt',
    iv: 'iv',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    permissions: ['permission1'],
  })),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

// Mock crypto
vi.mock('crypto', () => ({
  randomBytes: vi.fn().mockReturnValue(Buffer.from('0'.repeat(32), 'hex')),
  scryptSync: vi.fn().mockReturnValue(Buffer.alloc(32)),
  createCipheriv: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnValue('encrypted'),
    final: vi.fn().mockReturnValue(''),
    getAuthTag: vi.fn().mockReturnValue(Buffer.alloc(16)),
  }),
  createDecipheriv: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnValue('0x' + 'a'.repeat(64)),
    final: vi.fn().mockReturnValue(''),
    setAuthTag: vi.fn(),
  }),
}));

describe('EphemeralKeyManager', () => {
  let keyManager: EphemeralKeyManager;

  beforeEach(() => {
    vi.clearAllMocks();
    keyManager = new EphemeralKeyManager({
      storageDir: '/tmp/.morpheus',
      expirationHours: 24,
    });
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const manager = new EphemeralKeyManager();
      expect(manager).toBeDefined();
    });

    it('should create instance with custom config', () => {
      const manager = new EphemeralKeyManager({
        storageDir: '/custom/path',
        expirationHours: 48,
      });
      expect(manager).toBeDefined();
    });
  });

  describe('generate', () => {
    it('should generate a new ephemeral key', async () => {
      const permissions = ['/akash.deployment.v1beta3.MsgCreateDeployment'];
      const keyData = await keyManager.generate(permissions);

      expect(keyData).toBeDefined();
      expect(keyData.address).toBeDefined();
      expect(keyData.publicKey).toBeDefined();
      expect(keyData.encryptedPrivateKey).toBeDefined();
      expect(keyData.permissions).toEqual(permissions);
    });

    it('should set correct expiration', async () => {
      const before = Date.now();
      const keyData = await keyManager.generate([]);
      const after = Date.now();

      const expiresAt = new Date(keyData.expiresAt).getTime();
      const expectedMin = before + 24 * 60 * 60 * 1000;
      const expectedMax = after + 24 * 60 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt).toBeLessThanOrEqual(expectedMax);
    });

    it('should store permissions correctly', async () => {
      const permissions = [
        '/akash.deployment.v1beta3.MsgCreateDeployment',
        '/akash.deployment.v1beta3.MsgUpdateDeployment',
        '/akash.deployment.v1beta3.MsgCloseDeployment',
      ];

      const keyData = await keyManager.generate(permissions);

      expect(keyData.permissions).toHaveLength(3);
      expect(keyData.permissions).toEqual(permissions);
    });
  });

  describe('isExpired', () => {
    it('should return true when no key is loaded', () => {
      expect(keyManager.isExpired()).toBe(true);
    });

    it('should return false for valid key', async () => {
      await keyManager.generate([]);
      expect(keyManager.isExpired()).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should return false when no key is loaded', () => {
      expect(keyManager.hasPermission('/some.permission')).toBe(false);
    });

    it('should return true for granted permission', async () => {
      const permission = '/akash.deployment.v1beta3.MsgCreateDeployment';
      await keyManager.generate([permission]);

      expect(keyManager.hasPermission(permission)).toBe(true);
    });

    it('should return false for non-granted permission', async () => {
      await keyManager.generate(['/akash.deployment.v1beta3.MsgCreateDeployment']);

      expect(keyManager.hasPermission('/cosmos.bank.v1beta1.MsgSend')).toBe(false);
    });

    it('should return true for any permission when wildcard is granted', async () => {
      await keyManager.generate(['*']);

      expect(keyManager.hasPermission('/any.permission')).toBe(true);
    });
  });

  describe('getAccount', () => {
    it('should throw when no key is loaded', () => {
      expect(() => keyManager.getAccount()).toThrow('Ephemeral key not loaded');
    });

    it('should return account after generate', async () => {
      await keyManager.generate([]);
      const account = keyManager.getAccount();

      expect(account).toBeDefined();
      expect(account.address).toBeDefined();
    });
  });

  describe('getTimeRemaining', () => {
    it('should return 0 when no key is loaded', () => {
      expect(keyManager.getTimeRemaining()).toBe(0);
    });

    it('should return positive value for valid key', async () => {
      await keyManager.generate([]);
      const remaining = keyManager.getTimeRemaining();

      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    });
  });

  describe('recordGrant', () => {
    it('should throw when no key is loaded', async () => {
      await expect(keyManager.recordGrant('0xabc123')).rejects.toThrow('No ephemeral key loaded');
    });

    it('should record grant tx hash', async () => {
      await keyManager.generate([]);
      await expect(keyManager.recordGrant('0xabc123')).resolves.not.toThrow();
    });
  });

  describe('extend', () => {
    it('should throw when no key is loaded', async () => {
      await expect(keyManager.extend(24)).rejects.toThrow('No ephemeral key loaded');
    });

    it('should extend expiration', async () => {
      await keyManager.generate([]);
      const beforeExtend = keyManager.getTimeRemaining();

      await keyManager.extend(24);
      const afterExtend = keyManager.getTimeRemaining();

      expect(afterExtend).toBeGreaterThan(beforeExtend);
    });
  });
});
