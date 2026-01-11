import type { AkashDeployment, AkashLease, Bid, Provider } from '../../types.js';
import type { CreateDeploymentParams, DeploymentConfig } from '../client.js';

/**
 * Mock Akash Client for unit testing
 * Simulates Akash deployment flow without network calls
 */
export class AkashClient {
  private rpcUrl: string;
  private restUrl: string;
  private signingClient: any = null;
  private mockDeployments: Map<string, AkashDeployment> = new Map();
  private mockBids: Map<string, Bid[]> = new Map();
  private mockLeases: Map<string, AkashLease> = new Map();
  private mockProviders: Map<string, Provider> = new Map();
  private nextDseq = 1000000;

  constructor(config: DeploymentConfig) {
    this.rpcUrl = config.rpcUrl || 'http://mock-akash-rpc:443';
    this.restUrl = 'http://mock-akash-rest:443';

    // Initialize mock providers
    this.initializeMockProviders();
  }

  /**
   * Connect to Akash network (mocked - always succeeds)
   */
  async connect(): Promise<void> {
    // Mock connection - no-op
    return Promise.resolve();
  }

  /**
   * Connect with signing capabilities (mocked)
   */
  async connectWithSigner(mnemonic: string): Promise<void> {
    this.signingClient = { mnemonic }; // Mock signing client
    return Promise.resolve();
  }

  /**
   * Create a new deployment (mocked)
   */
  async createDeployment(params: CreateDeploymentParams): Promise<{
    dseq: string;
    txHash: string;
  }> {
    if (!this.signingClient) {
      throw new Error('Signing client not connected');
    }

    const dseq = this.generateDSEQ();
    const deployment: AkashDeployment = {
      deployment: {
        deployment_id: {
          owner: params.owner,
          dseq,
        },
        state: 'active',
        version: Buffer.from(params.sdl).toString('hex'),
        created_at: Date.now(),
      },
      groups: [
        {
          group_id: {
            owner: params.owner,
            dseq,
            gseq: 1,
          },
          state: 'open',
          group_spec: {
            name: 'web',
            requirements: {
              signed_by: { all_of: [], any_of: [] },
              attributes: [],
            },
            resources: [
              {
                resources: {
                  cpu: { units: { val: '1000' }, attributes: [] },
                  memory: { quantity: { val: '512Mi' }, attributes: [] },
                  storage: [{ name: 'default', quantity: { val: '1Gi' }, attributes: [] }],
                  endpoints: [],
                },
                count: 1,
                price: { denom: 'uakt', amount: '100' },
              },
            ],
          },
          created_at: Date.now(),
        },
      ],
      escrow_account: {
        id: {
          scope: 'deployment',
          xid: dseq,
        },
        owner: params.owner,
        state: 'open',
        balance: params.deposit,
        transferred: { denom: 'uakt', amount: '0' },
        settled_at: Date.now(),
        depositor: params.owner,
        funds: params.deposit,
      },
    };

    this.mockDeployments.set(`${params.owner}:${dseq}`, deployment);

    // Auto-generate mock bids after deployment
    setTimeout(() => this.generateMockBids(params.owner, dseq), 100);

    return {
      dseq,
      txHash: `0x${dseq}${'a'.repeat(56)}`, // Mock tx hash
    };
  }

  /**
   * Query deployment by DSEQ (mocked)
   */
  async getDeployment(owner: string, dseq: string): Promise<AkashDeployment | null> {
    return this.mockDeployments.get(`${owner}:${dseq}`) || null;
  }

  /**
   * List all deployments for an owner (mocked)
   */
  async listDeployments(owner: string): Promise<AkashDeployment[]> {
    return Array.from(this.mockDeployments.entries())
      .filter(([key]) => key.startsWith(`${owner}:`))
      .map(([, deployment]) => deployment);
  }

  /**
   * Wait for bids on a deployment (mocked - returns immediately)
   */
  async waitForBids(owner: string, dseq: string, timeout = 60000): Promise<Bid[]> {
    const key = `${owner}:${dseq}`;

    // Wait a short time for mock bids to be generated
    await this.sleep(150);

    return this.mockBids.get(key) || [];
  }

  /**
   * Create a lease from a bid (mocked)
   */
  async createLease(
    owner: string,
    dseq: string,
    provider: string,
    gseq = 1,
    oseq = 1
  ): Promise<{ leaseId: string; txHash: string }> {
    if (!this.signingClient) {
      throw new Error('Signing client not connected');
    }

    const leaseId = `${dseq}-${gseq}-${oseq}-${provider}`;
    const lease: AkashLease = {
      lease: {
        lease_id: {
          owner,
          dseq,
          gseq,
          oseq,
          provider,
        },
        state: 'active',
        price: { denom: 'uakt', amount: '100' },
        created_at: Date.now(),
        closed_on: 0,
      },
      escrow_payment: {
        account_id: {
          scope: 'deployment',
          xid: dseq,
        },
        payment_id: `${dseq}-${gseq}-${oseq}`,
        owner,
        state: 'open',
        rate: { denom: 'uakt', amount: '100' },
        balance: { denom: 'uakt', amount: '10000' },
        withdrawn: { denom: 'uakt', amount: '0' },
      },
    };

    this.mockLeases.set(leaseId, lease);

    return {
      leaseId,
      txHash: `0x${leaseId.replace(/-/g, '')}${'b'.repeat(20)}`,
    };
  }

  /**
   * Get lease status (mocked)
   */
  async getLease(
    owner: string,
    dseq: string,
    gseq: number,
    oseq: number,
    provider: string
  ): Promise<AkashLease | null> {
    const leaseId = `${dseq}-${gseq}-${oseq}-${provider}`;
    return this.mockLeases.get(leaseId) || null;
  }

  /**
   * Send manifest to provider (mocked - always succeeds)
   */
  async sendManifest(
    provider: string,
    dseq: string,
    manifest: unknown
  ): Promise<void> {
    // Mock manifest upload - no-op
    return Promise.resolve();
  }

  /**
   * Get service status from provider (mocked)
   */
  async getServiceStatus(
    provider: string,
    dseq: string
  ): Promise<{ ready: boolean; services: Array<{ name: string; uris: string[] }> }> {
    return {
      ready: true,
      services: [
        {
          name: 'web',
          uris: [`https://mock-deployment-${dseq}.akash-provider.net`],
        },
      ],
    };
  }

  /**
   * Get provider information (mocked)
   */
  async getProvider(address: string): Promise<Provider | null> {
    return this.mockProviders.get(address) || null;
  }

  /**
   * Close deployment (mocked)
   */
  async closeDeployment(owner: string, dseq: string): Promise<{ txHash: string }> {
    const key = `${owner}:${dseq}`;
    const deployment = this.mockDeployments.get(key);

    if (deployment) {
      deployment.deployment.state = 'closed';
      this.mockDeployments.set(key, deployment);
    }

    return {
      txHash: `0xclose${dseq}${'c'.repeat(50)}`,
    };
  }

  // Helper methods

  private generateDSEQ(): string {
    return (this.nextDseq++).toString();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Initialize mock providers with realistic data
   */
  private initializeMockProviders(): void {
    const providers: Provider[] = [
      {
        owner: 'akash1provider1xxxxxxxxxxxxxxxxxxxxxxxxx',
        host_uri: 'https://provider1.akash.network',
        attributes: [
          { key: 'region', value: 'us-west' },
          { key: 'tier', value: 'community' },
        ],
        info: {
          email: 'provider1@akash.network',
          website: 'https://provider1.akash.network',
        },
      },
      {
        owner: 'akash1provider2yyyyyyyyyyyyyyyyyyyyyyyyy',
        host_uri: 'https://provider2.akash.network',
        attributes: [
          { key: 'region', value: 'eu-west' },
          { key: 'tier', value: 'verified' },
        ],
        info: {
          email: 'provider2@akash.network',
          website: 'https://provider2.akash.network',
        },
      },
      {
        owner: 'akash1provider3zzzzzzzzzzzzzzzzzzzzzzzzz',
        host_uri: 'https://provider3.akash.network',
        attributes: [
          { key: 'region', value: 'ap-southeast' },
          { key: 'tier', value: 'verified' },
        ],
        info: {
          email: 'provider3@akash.network',
          website: 'https://provider3.akash.network',
        },
      },
    ];

    providers.forEach(p => this.mockProviders.set(p.owner, p));
  }

  /**
   * Generate realistic mock bids for a deployment
   */
  private generateMockBids(owner: string, dseq: string): void {
    const providers = Array.from(this.mockProviders.keys());
    const bids: Bid[] = providers.slice(0, 3).map((provider, idx) => ({
      bid: {
        bid_id: {
          owner,
          dseq,
          gseq: 1,
          oseq: 1,
          provider,
        },
        state: 'open',
        price: {
          denom: 'uakt',
          amount: (100 + idx * 10).toString(), // Varied pricing
        },
        created_at: Date.now(),
      },
      escrow_account: {
        id: {
          scope: 'bid',
          xid: `${dseq}-1-1-${provider}`,
        },
        owner: provider,
        state: 'open',
        balance: { denom: 'uakt', amount: '1000' },
        transferred: { denom: 'uakt', amount: '0' },
        settled_at: Date.now(),
        depositor: provider,
        funds: { denom: 'uakt', amount: '1000' },
      },
    }));

    this.mockBids.set(`${owner}:${dseq}`, bids);
  }

  /**
   * Reset all mock data (useful for test cleanup)
   */
  reset(): void {
    this.mockDeployments.clear();
    this.mockBids.clear();
    this.mockLeases.clear();
    this.nextDseq = 1000000;
  }
}
