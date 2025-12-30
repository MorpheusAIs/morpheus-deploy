import { SigningStargateClient, StargateClient } from '@cosmjs/stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { AkashMessages } from './messages.js';
import { AKASH_CONFIG } from '../constants.js';
import type { AkashDeployment, AkashLease, Bid, EscrowAccount, Provider } from '../types.js';

export interface DeploymentConfig {
  network: 'mainnet' | 'testnet';
  rpcUrl?: string;
}

export interface CreateDeploymentParams {
  owner: string;
  sdl: Uint8Array;
  deposit: { denom: string; amount: string };
}

export class AkashClient {
  private rpcUrl: string;
  private restUrl: string;
  private signingClient: SigningStargateClient | null = null;

  constructor(config: DeploymentConfig) {
    const networkConfig = AKASH_CONFIG[config.network];
    this.rpcUrl = config.rpcUrl || networkConfig.rpcUrl;
    this.restUrl = networkConfig.restUrl;
  }

  /**
   * Connect to Akash network (read-only)
   */
  async connect(): Promise<void> {
    await StargateClient.connect(this.rpcUrl);
  }

  /**
   * Connect with signing capabilities
   */
  async connectWithSigner(mnemonic: string): Promise<void> {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: 'akash',
    });

    this.signingClient = await SigningStargateClient.connectWithSigner(
      this.rpcUrl,
      wallet
    );
  }

  /**
   * Create a new deployment
   */
  async createDeployment(params: CreateDeploymentParams): Promise<{
    dseq: string;
    txHash: string;
  }> {
    if (!this.signingClient) {
      throw new Error('Signing client not connected');
    }

    const dseq = this.generateDSEQ();

    const msg = AkashMessages.createDeployment({
      owner: params.owner,
      dseq,
      version: params.sdl,
      groups: [], // Parsed from SDL
      deposit: params.deposit,
    });

    const result = await this.signingClient.signAndBroadcast(
      params.owner,
      [msg],
      'auto',
      'Morpheus Deployment'
    );

    if (result.code !== 0) {
      throw new Error(`Deployment failed: ${result.rawLog}`);
    }

    return {
      dseq,
      txHash: result.transactionHash,
    };
  }

  /**
   * Query deployment by DSEQ
   */
  async getDeployment(owner: string, dseq: string): Promise<AkashDeployment | null> {
    const response = await fetch(
      `${this.restUrl}/akash/deployment/v1beta3/deployments/info?id.owner=${owner}&id.dseq=${dseq}`
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to query deployment: ${response.statusText}`);
    }

    const data = await response.json() as { deployment: AkashDeployment };
    return data.deployment;
  }

  /**
   * List all deployments for an owner
   */
  async listDeployments(owner: string): Promise<AkashDeployment[]> {
    const response = await fetch(
      `${this.restUrl}/akash/deployment/v1beta3/deployments/list?filters.owner=${owner}`
    );

    if (!response.ok) {
      throw new Error(`Failed to list deployments: ${response.statusText}`);
    }

    const data = await response.json() as { deployments: Array<{ deployment: AkashDeployment }> };
    return data.deployments.map(d => d.deployment);
  }

  /**
   * Wait for bids on a deployment
   */
  async waitForBids(owner: string, dseq: string, timeout = 60000): Promise<Bid[]> {
    const startTime = Date.now();
    const bids: Bid[] = [];

    while (Date.now() - startTime < timeout) {
      const response = await fetch(
        `${this.restUrl}/akash/market/v1beta4/bids/list?filters.owner=${owner}&filters.dseq=${dseq}`
      );

      if (response.ok) {
        const data = await response.json() as { bids: Array<{ bid: Bid }> };
        const newBids = data.bids.map(b => b.bid);

        for (const bid of newBids) {
          if (!bids.find(b => b.id.provider === bid.id.provider)) {
            bids.push(bid);
          }
        }

        if (bids.length >= 3) break;
      }

      await this.sleep(2000);
    }

    return bids;
  }

  /**
   * Create a lease from a bid
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

    const msg = AkashMessages.createLease({
      owner,
      dseq,
      gseq,
      oseq,
      provider,
    });

    const result = await this.signingClient.signAndBroadcast(
      owner,
      [msg],
      'auto',
      'Morpheus Lease'
    );

    if (result.code !== 0) {
      throw new Error(`Lease creation failed: ${result.rawLog}`);
    }

    return {
      leaseId: `${dseq}-${gseq}-${oseq}-${provider}`,
      txHash: result.transactionHash,
    };
  }

  /**
   * Get lease status
   */
  async getLease(
    owner: string,
    dseq: string,
    gseq: number,
    oseq: number,
    provider: string
  ): Promise<AkashLease | null> {
    const response = await fetch(
      `${this.restUrl}/akash/market/v1beta4/leases/info?id.owner=${owner}&id.dseq=${dseq}&id.gseq=${gseq}&id.oseq=${oseq}&id.provider=${provider}`
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to query lease: ${response.statusText}`);
    }

    const data = await response.json() as { lease: AkashLease };
    return data.lease;
  }

  /**
   * Send manifest to provider
   */
  async sendManifest(
    provider: string,
    dseq: string,
    manifest: unknown
  ): Promise<void> {
    const providerInfo = await this.getProvider(provider);
    if (!providerInfo) {
      throw new Error(`Provider ${provider} not found`);
    }

    const response = await fetch(`${providerInfo.hostUri}/deployment/${dseq}/manifest`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(manifest),
    });

    if (!response.ok) {
      throw new Error(`Failed to send manifest: ${response.statusText}`);
    }
  }

  /**
   * Get service status from provider
   */
  async getServiceStatus(
    provider: string,
    dseq: string
  ): Promise<{ ready: boolean; services: Array<{ name: string; uris: string[] }> }> {
    const providerInfo = await this.getProvider(provider);
    if (!providerInfo) {
      throw new Error(`Provider ${provider} not found`);
    }

    const response = await fetch(`${providerInfo.hostUri}/lease/${dseq}/1/1/status`);

    if (!response.ok) {
      throw new Error(`Failed to get service status: ${response.statusText}`);
    }

    return response.json() as Promise<{ ready: boolean; services: Array<{ name: string; uris: string[] }> }>;
  }

  /**
   * Query escrow account
   */
  async getEscrow(owner: string, dseq: string): Promise<EscrowAccount | null> {
    const response = await fetch(
      `${this.restUrl}/akash/escrow/v1beta3/accounts/info?id.scope=deployment&id.xid=${owner}/${dseq}`
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to query escrow: ${response.statusText}`);
    }

    const data = await response.json() as { account: EscrowAccount };
    return data.account;
  }

  /**
   * Deposit to deployment escrow
   */
  async deposit(
    owner: string,
    dseq: string,
    amount: { denom: string; amount: string }
  ): Promise<string> {
    if (!this.signingClient) {
      throw new Error('Signing client not connected');
    }

    const msg = AkashMessages.deposit({
      owner,
      dseq,
      amount,
    });

    const result = await this.signingClient.signAndBroadcast(
      owner,
      [msg],
      'auto',
      'Morpheus Deposit'
    );

    if (result.code !== 0) {
      throw new Error(`Deposit failed: ${result.rawLog}`);
    }

    return result.transactionHash;
  }

  /**
   * Close a deployment
   */
  async closeDeployment(owner: string, dseq: string): Promise<string> {
    if (!this.signingClient) {
      throw new Error('Signing client not connected');
    }

    const msg = AkashMessages.closeDeployment({
      owner,
      dseq,
    });

    const result = await this.signingClient.signAndBroadcast(
      owner,
      [msg],
      'auto',
      'Morpheus Close Deployment'
    );

    if (result.code !== 0) {
      throw new Error(`Close deployment failed: ${result.rawLog}`);
    }

    return result.transactionHash;
  }

  /**
   * Get provider info
   */
  async getProvider(address: string): Promise<Provider | null> {
    const response = await fetch(
      `${this.restUrl}/akash/provider/v1beta3/providers/${address}`
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to query provider: ${response.statusText}`);
    }

    const data = await response.json() as { provider: Provider };
    return data.provider;
  }

  /**
   * List verified providers
   */
  async listVerifiedProviders(): Promise<Provider[]> {
    const response = await fetch(
      `${this.restUrl}/akash/provider/v1beta3/providers`
    );

    if (!response.ok) {
      throw new Error(`Failed to list providers: ${response.statusText}`);
    }

    const data = await response.json() as { providers: Provider[] };

    // Filter for verified/audited providers
    return data.providers.filter(p =>
      p.attributes.some(a => a.key === 'auditor' || a.key === 'verified')
    );
  }

  private generateDSEQ(): string {
    return Math.floor(Date.now() / 1000).toString();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
