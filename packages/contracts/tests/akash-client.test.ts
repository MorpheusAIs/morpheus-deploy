import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AkashClient } from '../src/akash/client';

// Mock CosmJS
vi.mock('@cosmjs/stargate', () => ({
  SigningStargateClient: {
    connectWithSigner: vi.fn().mockResolvedValue({
      signAndBroadcast: vi.fn().mockResolvedValue({
        code: 0,
        transactionHash: 'DEPLOY123',
        gasUsed: 200000,
        gasWanted: 250000,
      }),
    }),
  },
  StargateClient: {
    connect: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@cosmjs/proto-signing', () => ({
  DirectSecp256k1HdWallet: {
    fromMnemonic: vi.fn().mockResolvedValue({
      getAccounts: vi.fn().mockResolvedValue([{
        address: 'akash1owner123',
      }]),
    }),
  },
}));

// Mock the AkashMessages module
vi.mock('../src/akash/messages.js', () => ({
  AkashMessages: {
    createDeployment: vi.fn().mockReturnValue({
      typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
      value: {},
    }),
    createLease: vi.fn().mockReturnValue({
      typeUrl: '/akash.market.v1beta4.MsgCreateLease',
      value: {},
    }),
    deposit: vi.fn().mockReturnValue({
      typeUrl: '/akash.deployment.v1beta3.MsgDepositDeployment',
      value: {},
    }),
    closeDeployment: vi.fn().mockReturnValue({
      typeUrl: '/akash.deployment.v1beta3.MsgCloseDeployment',
      value: {},
    }),
  },
}));

// Mock constants
vi.mock('../src/constants.js', () => ({
  AKASH_CONFIG: {
    mainnet: {
      rpcUrl: 'https://rpc.akashnet.net:443',
      restUrl: 'https://api.akashnet.net',
    },
    testnet: {
      rpcUrl: 'https://rpc.testnet.akash.network:443',
      restUrl: 'https://api.testnet.akash.network',
    },
  },
}));

// Mock fetch for REST API calls
global.fetch = vi.fn().mockImplementation((url: string) => {
  if (url.includes('/deployments/info')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        deployment: {
          deployment_id: { owner: 'akash1owner123', dseq: '12345' },
          state: 'active',
        },
      }),
    });
  }
  if (url.includes('/deployments/list')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        deployments: [
          { deployment: { deployment_id: { owner: 'akash1owner123', dseq: '12345' }, state: 'active' } },
        ],
      }),
    });
  }
  if (url.includes('/bids/list')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        bids: [
          { bid: { id: { provider: 'akash1provider1' }, price: { amount: '500', denom: 'uakt' } } },
          { bid: { id: { provider: 'akash1provider2' }, price: { amount: '750', denom: 'uakt' } } },
          { bid: { id: { provider: 'akash1provider3' }, price: { amount: '1000', denom: 'uakt' } } },
        ],
      }),
    });
  }
  if (url.includes('/leases/info')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        lease: {
          lease_id: { owner: 'akash1owner123', dseq: '12345', provider: 'akash1provider1' },
          state: 'active',
        },
      }),
    });
  }
  if (url.includes('/escrow/')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        account: {
          id: { scope: 'deployment', xid: 'akash1owner123/12345' },
          balance: { amount: '5000000', denom: 'uakt' },
        },
      }),
    });
  }
  if (url.includes('/providers/')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        provider: {
          owner: 'akash1provider1',
          hostUri: 'https://provider.akashnet.net',
          attributes: [{ key: 'verified', value: 'true' }],
        },
      }),
    });
  }
  if (url.includes('/providers')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        providers: [
          { owner: 'akash1provider1', hostUri: 'https://p1.akash.net', attributes: [{ key: 'auditor', value: 'true' }] },
          { owner: 'akash1provider2', hostUri: 'https://p2.akash.net', attributes: [] },
        ],
      }),
    });
  }
  if (url.includes('/manifest') || url.includes('/status')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        ready: true,
        services: [{ name: 'web', uris: ['https://app.provider.akash.net'] }],
      }),
    });
  }
  return Promise.resolve({
    ok: false,
    status: 404,
    statusText: 'Not Found',
  });
});

describe('AkashClient', () => {
  let akashClient: AkashClient;

  beforeEach(() => {
    vi.clearAllMocks();
    akashClient = new AkashClient({
      network: 'testnet',
    });
  });

  describe('constructor', () => {
    it('should create instance for mainnet', () => {
      const client = new AkashClient({ network: 'mainnet' });
      expect(client).toBeDefined();
    });

    it('should create instance for testnet', () => {
      const client = new AkashClient({ network: 'testnet' });
      expect(client).toBeDefined();
    });

    it('should accept custom RPC URL', () => {
      const client = new AkashClient({
        network: 'testnet',
        rpcUrl: 'https://custom.rpc.url',
      });
      expect(client).toBeDefined();
    });
  });

  describe('connect', () => {
    it('should connect in read-only mode', async () => {
      await expect(akashClient.connect()).resolves.not.toThrow();
    });
  });

  describe('connectWithSigner', () => {
    it('should connect with signer for transactions', async () => {
      await expect(akashClient.connectWithSigner('test mnemonic')).resolves.not.toThrow();
    });
  });

  describe('createDeployment', () => {
    it('should throw when not connected', async () => {
      await expect(akashClient.createDeployment({
        owner: 'akash1owner123',
        sdl: new Uint8Array([1, 2, 3]),
        deposit: { denom: 'uakt', amount: '5000000' },
      })).rejects.toThrow('Signing client not connected');
    });

    it('should create deployment when connected', async () => {
      await akashClient.connectWithSigner('test mnemonic');

      const result = await akashClient.createDeployment({
        owner: 'akash1owner123',
        sdl: new Uint8Array([1, 2, 3]),
        deposit: { denom: 'uakt', amount: '5000000' },
      });

      expect(result).toBeDefined();
      expect(result.dseq).toBeDefined();
      expect(result.txHash).toBeDefined();
    });
  });

  describe('getDeployment', () => {
    it('should return deployment info', async () => {
      const deployment = await akashClient.getDeployment('akash1owner123', '12345');

      expect(deployment).toBeDefined();
    });

    it('should return null for non-existent deployment', async () => {
      vi.mocked(global.fetch).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 404,
        } as Response)
      );

      const deployment = await akashClient.getDeployment('akash1owner123', '99999');

      expect(deployment).toBeNull();
    });
  });

  describe('listDeployments', () => {
    it('should return list of deployments', async () => {
      const deployments = await akashClient.listDeployments('akash1owner123');

      expect(Array.isArray(deployments)).toBe(true);
    });
  });

  describe('waitForBids', () => {
    it('should return bids for deployment', async () => {
      const bids = await akashClient.waitForBids('akash1owner123', '12345');

      expect(Array.isArray(bids)).toBe(true);
    });

    it('should respect timeout parameter', async () => {
      const startTime = Date.now();
      await akashClient.waitForBids('akash1owner123', '12345', 100);
      const elapsed = Date.now() - startTime;

      // Should complete quickly since mock returns 3 bids
      expect(elapsed).toBeLessThan(5000);
    });
  });

  describe('createLease', () => {
    it('should throw when not connected', async () => {
      await expect(akashClient.createLease(
        'akash1owner123',
        '12345',
        'akash1provider1'
      )).rejects.toThrow('Signing client not connected');
    });

    it('should create lease when connected', async () => {
      await akashClient.connectWithSigner('test mnemonic');

      const result = await akashClient.createLease(
        'akash1owner123',
        '12345',
        'akash1provider1'
      );

      expect(result).toBeDefined();
      expect(result.leaseId).toBeDefined();
      expect(result.txHash).toBeDefined();
    });

    it('should accept optional gseq and oseq', async () => {
      await akashClient.connectWithSigner('test mnemonic');

      const result = await akashClient.createLease(
        'akash1owner123',
        '12345',
        'akash1provider1',
        2,
        3
      );

      expect(result.leaseId).toContain('2-3');
    });
  });

  describe('getLease', () => {
    it('should return lease info', async () => {
      const lease = await akashClient.getLease(
        'akash1owner123',
        '12345',
        1,
        1,
        'akash1provider1'
      );

      expect(lease).toBeDefined();
    });
  });

  describe('sendManifest', () => {
    it('should send manifest to provider', async () => {
      await expect(akashClient.sendManifest(
        'akash1provider1',
        '12345',
        { services: {} }
      )).resolves.not.toThrow();
    });
  });

  describe('getServiceStatus', () => {
    it('should return service status', async () => {
      const status = await akashClient.getServiceStatus('akash1provider1', '12345');

      expect(status).toBeDefined();
      expect(status.ready).toBe(true);
      expect(Array.isArray(status.services)).toBe(true);
    });
  });

  describe('getEscrow', () => {
    it('should return escrow account', async () => {
      const escrow = await akashClient.getEscrow('akash1owner123', '12345');

      expect(escrow).toBeDefined();
    });

    it('should return null for non-existent escrow', async () => {
      vi.mocked(global.fetch).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 404,
        } as Response)
      );

      const escrow = await akashClient.getEscrow('akash1owner123', '99999');

      expect(escrow).toBeNull();
    });
  });

  describe('deposit', () => {
    it('should throw when not connected', async () => {
      await expect(akashClient.deposit(
        'akash1owner123',
        '12345',
        { denom: 'uakt', amount: '5000000' }
      )).rejects.toThrow('Signing client not connected');
    });

    it('should deposit when connected', async () => {
      await akashClient.connectWithSigner('test mnemonic');

      const txHash = await akashClient.deposit(
        'akash1owner123',
        '12345',
        { denom: 'uakt', amount: '5000000' }
      );

      expect(txHash).toBeDefined();
      expect(typeof txHash).toBe('string');
    });
  });

  describe('closeDeployment', () => {
    it('should throw when not connected', async () => {
      await expect(akashClient.closeDeployment(
        'akash1owner123',
        '12345'
      )).rejects.toThrow('Signing client not connected');
    });

    it('should close deployment when connected', async () => {
      await akashClient.connectWithSigner('test mnemonic');

      const txHash = await akashClient.closeDeployment('akash1owner123', '12345');

      expect(txHash).toBeDefined();
      expect(typeof txHash).toBe('string');
    });
  });

  describe('getProvider', () => {
    it('should return provider info', async () => {
      const provider = await akashClient.getProvider('akash1provider1');

      expect(provider).toBeDefined();
    });

    it('should return null for non-existent provider', async () => {
      vi.mocked(global.fetch).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 404,
        } as Response)
      );

      const provider = await akashClient.getProvider('akash1unknown');

      expect(provider).toBeNull();
    });
  });

  describe('listVerifiedProviders', () => {
    it('should return verified providers only', async () => {
      const providers = await akashClient.listVerifiedProviders();

      expect(Array.isArray(providers)).toBe(true);
      // Should filter for verified/audited providers
      providers.forEach(p => {
        expect(p.attributes.some(a => a.key === 'auditor' || a.key === 'verified')).toBe(true);
      });
    });
  });
});
