import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { MorpheusConfig } from './config.js';
import type { WalletManager } from './wallet.js';

const DEPLOYMENTS_DIR = '.morpheus/deployments';

export interface SDLManifest {
  version: string;
  services: Record<string, SDLService>;
  profiles: {
    compute: Record<string, SDLComputeProfile>;
  };
  deployment: Record<string, SDLDeployment>;
  placement: {
    akash: {
      pricing: {
        denom: string;
        amount: number;
      };
    };
  };
  // Computed properties
  estimatedCost: number;
  gpu?: { model: string; units: number };
}

interface SDLService {
  image: string;
  expose: Array<{
    port: number;
    as: number;
    to: Array<{ global?: boolean; service?: string }>;
  }>;
  env?: string[];
  params?: {
    storage?: Record<string, { mount: string }>;
  };
  resources: {
    cpu: { units: number };
    memory: { size: string };
    gpu?: { units: number; attributes: { vendor: { nvidia: Array<{ model: string }> } } };
    storage: Array<{ size: string; attributes?: { persistent: boolean } }>;
  };
}

interface SDLComputeProfile {
  resources: {
    cpu: { units: number };
    memory: { size: string };
  };
}

interface SDLDeployment {
  profile: string;
  count: number;
}

export interface Deployment {
  dseq: string;
  owner: string;
  state: 'active' | 'closed' | 'pending';
  createdAt: Date;
}

export interface Lease {
  id: string;
  dseq: string;
  provider: string;
  state: 'active' | 'closed';
  price: number;
}

export interface Bid {
  id: string;
  provider: string;
  price: number;
  attributes: Record<string, string>;
}

export interface DeploymentStatus {
  dseq: string;
  state: 'active' | 'closed' | 'pending';
  provider: string;
  url?: string;
  escrowBalance: number;
  estimatedTimeRemaining: string;
  createdAt: Date;
  resources: {
    cpu: number;
    memory: string;
    gpu?: { model: string; units: number };
  };
}

export class DeploymentManager {
  private wallet: WalletManager;

  constructor(_config: MorpheusConfig, wallet: WalletManager) {
    this.wallet = wallet;
  }

  async create(sdl: SDLManifest): Promise<Deployment> {
    // Create deployment on Akash network
    // This would use @akashnetwork/akashjs

    // 1. Serialize SDL to protobuf
    const sdlBytes = this.serializeSDL(sdl);

    // 2. Create MsgCreateDeployment transaction
    const msg = {
      typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
      value: {
        id: {
          owner: await this.getOwnerAddress(),
          dseq: this.generateDSEQ(),
        },
        groups: this.parseGroups(sdl),
        version: sdlBytes,
        deposit: { denom: 'uakt', amount: '5000000' }, // 5 AKT minimum
      },
    };

    // 3. Sign and broadcast
    const txHash = await this.broadcastTransaction(msg);

    // 4. Wait for confirmation
    const deployment = await this.waitForDeployment(txHash);

    return deployment;
  }

  async waitForBids(dseq: string, timeout = 60000): Promise<Bid[]> {
    const startTime = Date.now();
    const bids: Bid[] = [];

    while (Date.now() - startTime < timeout) {
      const newBids = await this.queryBids(dseq);
      bids.push(...newBids.filter(b => !bids.find(existing => existing.id === b.id)));

      if (bids.length >= 3) {
        // Got enough bids
        break;
      }

      await this.sleep(2000);
    }

    if (bids.length === 0) {
      throw new Error('No bids received. Check if your SDL is valid and resources are available.');
    }

    return bids;
  }

  async selectBestBid(bids: Bid[]): Promise<Bid> {
    // Sort by price and select cheapest from verified providers
    const sortedBids = bids
      .filter(bid => this.isVerifiedProvider(bid.provider))
      .sort((a, b) => a.price - b.price);

    if (sortedBids.length === 0) {
      // Fall back to unverified if no verified providers
      return bids.sort((a, b) => a.price - b.price)[0]!;
    }

    return sortedBids[0]!;
  }

  async createLease(dseq: string, bid: Bid): Promise<Lease> {
    const msg = {
      typeUrl: '/akash.market.v1beta4.MsgCreateLease',
      value: {
        bidId: {
          owner: await this.getOwnerAddress(),
          dseq,
          gseq: 1,
          oseq: 1,
          provider: bid.provider,
        },
      },
    };

    await this.broadcastTransaction(msg);

    return {
      id: `${dseq}-1-1-${bid.provider}`,
      dseq,
      provider: bid.provider,
      state: 'active',
      price: bid.price,
    };
  }

  async sendManifest(lease: Lease, sdl: SDLManifest): Promise<void> {
    // Send manifest to provider's REST API
    const providerUrl = await this.getProviderUrl(lease.provider);

    const response = await fetch(`${providerUrl}/deployment/${lease.dseq}/manifest`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sdl),
    });

    if (!response.ok) {
      throw new Error(`Failed to send manifest: ${response.statusText}`);
    }
  }

  async waitForService(lease: Lease, timeout = 120000): Promise<string> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const status = await this.getLeaseStatus(lease);
        const service = status.services?.[0];
        const uri = service?.uris?.[0];
        if (uri) {
          return uri;
        }
      } catch {
        // Service not ready yet
      }

      await this.sleep(3000);
    }

    throw new Error('Service did not come online within timeout');
  }

  async getActiveDeployment(): Promise<Deployment | null> {
    // Check local state first
    const localState = await this.loadLocalState();
    if (localState?.active) {
      return localState.active;
    }

    // Query chain for active deployments
    const deployments = await this.listDeployments();
    const active = deployments.find(d => d.state === 'active');

    return active || null;
  }

  async listDeployments(): Promise<Deployment[]> {
    // Get owner address for querying (needed when implemented)
    await this.getOwnerAddress();

    // Query deployments from chain
    // This would use akashjs to query the deployment module

    return [];
  }

  async getStatus(dseq: string): Promise<DeploymentStatus | null> {
    // Query deployment status from chain
    const deployment = await this.queryDeployment(dseq);
    if (!deployment) return null;

    const lease = await this.getLease(dseq);
    const escrow = await this.queryEscrow(dseq);

    return {
      dseq,
      state: deployment.state,
      provider: lease?.provider || 'unknown',
      url: lease ? await this.getServiceUrl(lease) : undefined,
      escrowBalance: escrow.balance,
      estimatedTimeRemaining: this.calculateTimeRemaining(escrow),
      createdAt: new Date(deployment.createdAt),
      resources: deployment.resources,
    };
  }

  async getLease(_dseq: string): Promise<Lease | null> {
    // Query lease from chain
    return null;
  }

  async getLogRelayUrl(lease: Lease): Promise<string> {
    const providerUrl = await this.getProviderUrl(lease.provider);
    return `wss://${new URL(providerUrl).host}/deployment/${lease.dseq}/logs`;
  }

  async depositToEscrow(dseq: string, amount: number): Promise<void> {
    const msg = {
      typeUrl: '/akash.deployment.v1beta3.MsgDepositDeployment',
      value: {
        id: {
          owner: await this.getOwnerAddress(),
          dseq,
        },
        amount: {
          denom: 'uakt',
          amount: Math.floor(amount * 1000000).toString(),
        },
      },
    };

    await this.broadcastTransaction(msg);
  }

  async saveState(deployment: Deployment, lease: Lease, serviceUrl: string): Promise<void> {
    if (!existsSync(DEPLOYMENTS_DIR)) {
      await mkdir(DEPLOYMENTS_DIR, { recursive: true });
    }

    const state = {
      active: deployment,
      lease,
      serviceUrl,
      updatedAt: new Date().toISOString(),
    };

    await writeFile(
      join(DEPLOYMENTS_DIR, 'state.json'),
      JSON.stringify(state, null, 2)
    );
  }

  // Private helper methods

  private async loadLocalState(): Promise<{ active: Deployment; lease: Lease; serviceUrl: string } | null> {
    const statePath = join(DEPLOYMENTS_DIR, 'state.json');
    if (!existsSync(statePath)) {
      return null;
    }

    const content = await readFile(statePath, 'utf-8');
    return JSON.parse(content);
  }

  private async getOwnerAddress(): Promise<string> {
    const wallet = await this.wallet.load();
    return wallet.address;
  }

  private generateDSEQ(): string {
    return Math.floor(Date.now() / 1000).toString();
  }

  private serializeSDL(_sdl: SDLManifest): Uint8Array {
    // Serialize SDL to bytes for on-chain storage
    return new Uint8Array();
  }

  private parseGroups(_sdl: SDLManifest): unknown[] {
    // Parse SDL into deployment groups
    return [];
  }

  private async broadcastTransaction(_msg: unknown): Promise<string> {
    // Sign and broadcast transaction using ephemeral key
    return '0x' + Math.random().toString(16).slice(2);
  }

  private async waitForDeployment(txHash: string): Promise<Deployment> {
    // Wait for transaction confirmation and return deployment
    console.log(`Waiting for tx: ${txHash}`);
    return {
      dseq: this.generateDSEQ(),
      owner: await this.getOwnerAddress(),
      state: 'pending',
      createdAt: new Date(),
    };
  }

  private async queryBids(_dseq: string): Promise<Bid[]> {
    // Query bids from Akash marketplace
    return [];
  }

  private isVerifiedProvider(_provider: string): boolean {
    // Check if provider is verified/audited
    return true;
  }

  private async getProviderUrl(provider: string): Promise<string> {
    // Query provider's API URL
    return `https://${provider}.akash.pub`;
  }

  private async getLeaseStatus(_lease: Lease): Promise<{ services: Array<{ uris: string[] }> }> {
    // Query lease status from provider
    return { services: [] };
  }

  private async queryDeployment(_dseq: string): Promise<{
    state: 'active' | 'closed' | 'pending';
    createdAt: string;
    resources: { cpu: number; memory: string; gpu?: { model: string; units: number } };
  } | null> {
    return null;
  }

  private async queryEscrow(_dseq: string): Promise<{ balance: number; burnRate: number }> {
    return { balance: 0, burnRate: 0 };
  }

  private async getServiceUrl(_lease: Lease): Promise<string | undefined> {
    return undefined;
  }

  private calculateTimeRemaining(escrow: { balance: number; burnRate: number }): string {
    if (escrow.burnRate === 0) return 'N/A';
    const hours = escrow.balance / escrow.burnRate;
    if (hours < 24) return `${Math.floor(hours)} hours`;
    return `${Math.floor(hours / 24)} days`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
