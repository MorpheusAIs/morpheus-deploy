import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AuthZManager } from '../src/authz/manager';
import type { AuthZPermission } from '../src/authz/manager';

// Mock CosmJS
vi.mock('@cosmjs/stargate', () => ({
  SigningStargateClient: {
    connectWithSigner: vi.fn().mockResolvedValue({
      signAndBroadcast: vi.fn().mockResolvedValue({
        code: 0,
        transactionHash: 'ABC123DEF456',
        gasUsed: 100000,
        gasWanted: 150000,
      }),
    }),
  },
}));

vi.mock('@cosmjs/proto-signing', () => ({
  DirectSecp256k1HdWallet: {
    fromMnemonic: vi.fn().mockResolvedValue({
      getAccounts: vi.fn().mockResolvedValue([{
        address: 'akash1granter123',
      }]),
    }),
  },
}));

// Mock the AuthZMessages module
vi.mock('../src/authz/messages.js', () => ({
  AuthZMessages: {
    createGrantMsg: vi.fn().mockReturnValue({
      typeUrl: '/cosmos.authz.v1beta1.MsgGrant',
      value: {},
    }),
    createRevokeMsg: vi.fn().mockReturnValue({
      typeUrl: '/cosmos.authz.v1beta1.MsgRevoke',
      value: {},
    }),
    createExecMsg: vi.fn().mockReturnValue({
      typeUrl: '/cosmos.authz.v1beta1.MsgExec',
      value: {},
    }),
  },
}));

// Mock fetch for query operations
global.fetch = vi.fn().mockImplementation((url: string) => {
  if (url.includes('/cosmos/authz/v1beta1/grants/grantee')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        grants: [
          {
            granter: 'akash1granter123',
            grantee: 'akash1grantee456',
            authorization: {
              '@type': '/cosmos.authz.v1beta1.GenericAuthorization',
              msg: '/akash.deployment.v1beta3.MsgCreateDeployment',
            },
            expiration: new Date(Date.now() + 86400000).toISOString(),
          },
        ],
      }),
    });
  }
  return Promise.resolve({
    ok: false,
    statusText: 'Not Found',
  });
});

describe('AuthZManager', () => {
  let authzManager: AuthZManager;

  beforeEach(() => {
    vi.clearAllMocks();
    authzManager = new AuthZManager('https://rpc.akashnet.net:443');
  });

  describe('constructor', () => {
    it('should create instance with RPC endpoint', () => {
      const manager = new AuthZManager('https://rpc.akashnet.net:443');
      expect(manager).toBeDefined();
    });

    it('should create instance with default endpoint', () => {
      const manager = new AuthZManager();
      expect(manager).toBeDefined();
    });
  });

  describe('DEPLOYMENT_PERMISSIONS', () => {
    it('should include all required deployment permissions', () => {
      const permissions = AuthZManager.DEPLOYMENT_PERMISSIONS;

      expect(permissions).toContainEqual(
        expect.objectContaining({
          msgType: '/akash.deployment.v1beta3.MsgCreateDeployment',
        })
      );
      expect(permissions).toContainEqual(
        expect.objectContaining({
          msgType: '/akash.deployment.v1beta3.MsgUpdateDeployment',
        })
      );
      expect(permissions).toContainEqual(
        expect.objectContaining({
          msgType: '/akash.deployment.v1beta3.MsgCloseDeployment',
        })
      );
      expect(permissions).toContainEqual(
        expect.objectContaining({
          msgType: '/akash.deployment.v1beta3.MsgDepositDeployment',
        })
      );
    });

    it('should include lease creation permission', () => {
      const permissions = AuthZManager.DEPLOYMENT_PERMISSIONS;

      expect(permissions).toContainEqual(
        expect.objectContaining({
          msgType: '/akash.market.v1beta4.MsgCreateLease',
        })
      );
    });
  });

  describe('GAS_STATION_SPEND_LIMIT', () => {
    it('should have correct spend limit', () => {
      const permission = AuthZManager.GAS_STATION_SPEND_LIMIT;

      expect(permission.msgType).toBe('/cosmos.bank.v1beta1.MsgSend');
      expect(permission.spendLimit).toBeDefined();
      expect(permission.spendLimit?.denom).toBe('uakt');
      expect(permission.spendLimit?.amount).toBe('100000000');
    });
  });

  describe('connect', () => {
    it('should connect with mnemonic', async () => {
      await expect(authzManager.connect('test mnemonic words')).resolves.not.toThrow();
    });
  });

  describe('createGrant', () => {
    it('should throw when not connected', async () => {
      await expect(authzManager.createGrant({
        granter: 'akash1granter123',
        grantee: 'akash1grantee456',
        permissions: [{ msgType: '/akash.deployment.v1beta3.MsgCreateDeployment' }],
      })).rejects.toThrow('Client not connected');
    });

    it('should create grant when connected', async () => {
      await authzManager.connect('test mnemonic');

      const grant = await authzManager.createGrant({
        granter: 'akash1granter123',
        grantee: 'akash1grantee456',
        permissions: [{ msgType: '/akash.deployment.v1beta3.MsgCreateDeployment' }],
        expirationDays: 7,
      });

      expect(grant).toBeDefined();
      expect(grant.granter).toBe('akash1granter123');
      expect(grant.grantee).toBe('akash1grantee456');
      expect(grant.txHash).toBeDefined();
    });

    it('should set default expiration of 7 days', async () => {
      await authzManager.connect('test mnemonic');

      const grant = await authzManager.createGrant({
        granter: 'akash1granter123',
        grantee: 'akash1grantee456',
        permissions: [{ msgType: '/akash.deployment.v1beta3.MsgCreateDeployment' }],
      });

      const expectedMinExpiration = new Date();
      expectedMinExpiration.setDate(expectedMinExpiration.getDate() + 6);

      expect(grant.expiration.getTime()).toBeGreaterThan(expectedMinExpiration.getTime());
    });
  });

  describe('createDeploymentGrant', () => {
    it('should create grant with deployment permissions', async () => {
      await authzManager.connect('test mnemonic');

      const grant = await authzManager.createDeploymentGrant(
        'akash1granter123',
        'akash1grantee456'
      );

      expect(grant).toBeDefined();
      expect(grant.permissions.length).toBeGreaterThan(0);
    });

    it('should include gas station permission when enabled', async () => {
      await authzManager.connect('test mnemonic');

      const grant = await authzManager.createDeploymentGrant(
        'akash1granter123',
        'akash1grantee456',
        true
      );

      expect(grant.permissions).toContainEqual(
        expect.objectContaining({
          msgType: '/cosmos.bank.v1beta1.MsgSend',
        })
      );
    });

    it('should not include gas station permission when disabled', async () => {
      await authzManager.connect('test mnemonic');

      const grant = await authzManager.createDeploymentGrant(
        'akash1granter123',
        'akash1grantee456',
        false
      );

      expect(grant.permissions).not.toContainEqual(
        expect.objectContaining({
          msgType: '/cosmos.bank.v1beta1.MsgSend',
        })
      );
    });
  });

  describe('revokeGrant', () => {
    it('should throw when not connected', async () => {
      await expect(authzManager.revokeGrant(
        'akash1granter123',
        'akash1grantee456',
        '/akash.deployment.v1beta3.MsgCreateDeployment'
      )).rejects.toThrow('Client not connected');
    });

    it('should revoke grant when connected', async () => {
      await authzManager.connect('test mnemonic');

      const txHash = await authzManager.revokeGrant(
        'akash1granter123',
        'akash1grantee456',
        '/akash.deployment.v1beta3.MsgCreateDeployment'
      );

      expect(txHash).toBeDefined();
      expect(typeof txHash).toBe('string');
    });
  });

  describe('queryGrants', () => {
    it('should query grants for grantee', async () => {
      const grants = await authzManager.queryGrants('akash1grantee456');

      expect(Array.isArray(grants)).toBe(true);
    });

    it('should return grant details', async () => {
      const grants = await authzManager.queryGrants('akash1grantee456');

      if (grants.length > 0) {
        expect(grants[0].granter).toBeDefined();
        expect(grants[0].grantee).toBeDefined();
        expect(grants[0].permissions).toBeDefined();
        expect(grants[0].expiration).toBeInstanceOf(Date);
      }
    });
  });

  describe('hasValidGrant', () => {
    it('should return true for valid grant', async () => {
      const hasGrant = await authzManager.hasValidGrant(
        'akash1granter123',
        'akash1grantee456',
        '/akash.deployment.v1beta3.MsgCreateDeployment'
      );

      expect(typeof hasGrant).toBe('boolean');
    });

    it('should return false for non-existent grant', async () => {
      // Mock fetch to return empty grants
      vi.mocked(global.fetch).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ grants: [] }),
        } as Response)
      );

      const hasGrant = await authzManager.hasValidGrant(
        'akash1granter123',
        'akash1grantee456',
        '/cosmos.bank.v1beta1.MsgSend'
      );

      expect(hasGrant).toBe(false);
    });
  });

  describe('executeWithGrant', () => {
    it('should throw when not connected', async () => {
      await expect(authzManager.executeWithGrant(
        'akash1grantee456',
        'akash1granter123',
        []
      )).rejects.toThrow('Client not connected');
    });

    it('should execute with grant when connected', async () => {
      await authzManager.connect('test mnemonic');

      const txHash = await authzManager.executeWithGrant(
        'akash1grantee456',
        'akash1granter123',
        [{ typeUrl: '/test', value: {} }]
      );

      expect(txHash).toBeDefined();
      expect(typeof txHash).toBe('string');
    });
  });
});
