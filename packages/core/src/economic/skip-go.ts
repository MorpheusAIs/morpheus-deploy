export interface RouteRequest {
  sourceChain: string;
  sourceToken: string;
  destChain: string;
  destToken: string;
  amount: string;
  smartRelay?: boolean;
  postRouteAction?: PostRouteAction;
}

export interface PostRouteAction {
  type: 'MsgDeposit' | 'Stake' | 'Transfer';
  dseq?: string;
  contract?: string;
  recipient?: string;
}

export interface RouteResponse {
  route: RouteHop[];
  estimatedOutput: string;
  estimatedFee: string;
  priceImpact: number;
  estimatedTime: number;
  sourceChain: string;
  destChain: string;
}

export interface RouteHop {
  from: string;
  to: string;
  type: 'swap' | 'bridge' | 'transfer';
  protocol: string;
  estimatedOutput: string;
}

export interface TransactionRequest {
  chainId: string;
  to: string;
  data: string;
  value: string;
  gasLimit: string;
}

export type NetworkMode = 'mainnet' | 'testnet';

export class SkipGoClient {
  private baseUrl: string = 'https://api.skip.money';
  private apiVersion: string = 'v2';
  private network: NetworkMode = 'mainnet';

  constructor(options?: { apiKey?: string; network?: NetworkMode }) {
    // API key for authenticated requests (optional for public endpoints)
    if (options?.apiKey) {
      // Store for authenticated requests
    }
    if (options?.network) {
      this.network = options.network;
    }
  }

  /**
   * Set network mode (mainnet or testnet)
   */
  setNetwork(network: NetworkMode): void {
    this.network = network;
  }

  /**
   * Get optimal route for a cross-chain swap
   */
  async getRoute(request: RouteRequest): Promise<RouteResponse> {
    const response = await this.request('/fungible/route', {
      method: 'POST',
      body: {
        source_asset_chain_id: this.getChainId(request.sourceChain),
        source_asset_denom: this.getDenom(request.sourceToken),
        dest_asset_chain_id: this.getChainId(request.destChain),
        dest_asset_denom: this.getDenom(request.destToken),
        amount_in: request.amount,
        smart_relay: request.smartRelay,
        post_route_handler: request.postRouteAction ? {
          type: request.postRouteAction.type,
          ...(request.postRouteAction.dseq && { dseq: request.postRouteAction.dseq }),
          ...(request.postRouteAction.contract && { contract: request.postRouteAction.contract }),
        } : undefined,
      },
    });

    return this.parseRouteResponse(response);
  }

  /**
   * Build transaction for route execution
   */
  async buildTransaction(route: RouteResponse): Promise<TransactionRequest> {
    const response = await this.request('/fungible/msgs', {
      method: 'POST',
      body: {
        route: route,
        slippage_tolerance_percent: '1.0',
      },
    }) as { to: string; data: string; value?: string; gas_limit?: string };

    return {
      chainId: route.sourceChain,
      to: response.to,
      data: response.data,
      value: response.value || '0',
      gasLimit: response.gas_limit || '500000',
    };
  }

  /**
   * Broadcast a signed transaction
   */
  async broadcastTransaction(
    signedTx: string,
    chainId: string
  ): Promise<{ txHash: string; status: string }> {
    const response = await this.request('/tx/submit', {
      method: 'POST',
      body: {
        chain_id: chainId,
        tx_bytes: signedTx,
      },
    }) as { tx_hash: string; status: string };

    return {
      txHash: response.tx_hash,
      status: response.status,
    };
  }

  /**
   * Track transaction status across chains
   */
  async getTransactionStatus(txHash: string, chainId: string): Promise<{
    status: 'pending' | 'success' | 'failed';
    currentStep: number;
    totalSteps: number;
    error?: string;
  }> {
    const response = await this.request(`/tx/status/${chainId}/${txHash}`, {
      method: 'GET',
    }) as { status: 'pending' | 'success' | 'failed'; current_step: number; total_steps: number; error?: string };

    return {
      status: response.status,
      currentStep: response.current_step,
      totalSteps: response.total_steps,
      error: response.error,
    };
  }

  /**
   * Wait for transaction to complete across all chains
   */
  async waitForCompletion(
    txHash: string,
    route: RouteResponse,
    timeout: number = 300000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const status = await this.getTransactionStatus(txHash, route.sourceChain);

      if (status.status === 'success') {
        return;
      }

      if (status.status === 'failed') {
        throw new Error(`Transaction failed: ${status.error || 'Unknown error'}`);
      }

      // Wait before next check
      await this.sleep(3000);
    }

    throw new Error('Transaction timeout');
  }

  /**
   * Get supported chains
   */
  async getChains(): Promise<Array<{ chainId: string; name: string; type: 'evm' | 'cosmos' }>> {
    const response = await this.request('/info/chains', { method: 'GET' }) as {
      chains: Array<{ chainId: string; name: string; type: 'evm' | 'cosmos' }>;
    };
    return response.chains;
  }

  /**
   * Get supported assets for a chain
   */
  async getAssets(chainId: string): Promise<Array<{ denom: string; symbol: string; decimals: number }>> {
    const response = await this.request(`/info/assets/${chainId}`, { method: 'GET' }) as {
      assets: Array<{ denom: string; symbol: string; decimals: number }>;
    };
    return response.assets;
  }

  private async request(
    path: string,
    options: { method: 'GET' | 'POST'; body?: unknown }
  ): Promise<Record<string, unknown>> {
    const url = `${this.baseUrl}/${this.apiVersion}${path}`;

    const response = await fetch(url, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText })) as { message: string };
      throw new Error(`Skip Go API error: ${error.message}`);
    }

    return response.json() as Promise<Record<string, unknown>>;
  }

  private parseRouteResponse(response: Record<string, unknown>): RouteResponse {
    const route = response as unknown as {
      operations: Array<{
        swap?: { from: string; to: string; protocol: string };
        transfer?: { from: string; to: string };
        bridge?: { from: string; to: string; protocol: string };
        estimated_output: string;
      }>;
      estimated_amount_out: string;
      estimated_fees: Array<{ amount: string }>;
      price_impact_percent: string;
      estimated_route_duration_seconds: number;
      source_chain_id: string;
      dest_chain_id: string;
    };

    return {
      route: route.operations.map(op => {
        if (op.swap) {
          return {
            from: op.swap.from,
            to: op.swap.to,
            type: 'swap' as const,
            protocol: op.swap.protocol,
            estimatedOutput: op.estimated_output,
          };
        }
        if (op.bridge) {
          return {
            from: op.bridge.from,
            to: op.bridge.to,
            type: 'bridge' as const,
            protocol: op.bridge.protocol,
            estimatedOutput: op.estimated_output,
          };
        }
        return {
          from: op.transfer!.from,
          to: op.transfer!.to,
          type: 'transfer' as const,
          protocol: 'ibc',
          estimatedOutput: op.estimated_output,
        };
      }),
      estimatedOutput: route.estimated_amount_out,
      estimatedFee: route.estimated_fees.reduce(
        (sum, fee) => sum + parseInt(fee.amount, 10),
        0
      ).toString(),
      priceImpact: parseFloat(route.price_impact_percent),
      estimatedTime: route.estimated_route_duration_seconds,
      sourceChain: route.source_chain_id,
      destChain: route.dest_chain_id,
    };
  }

  private getChainId(chain: string): string {
    const mainnetChains: Record<string, string> = {
      base: '8453',
      akash: 'akashnet-2',
      osmosis: 'osmosis-1',
      ethereum: '1',
      arbitrum: '42161',
    };

    const testnetChains: Record<string, string> = {
      base: '84532', // Base Sepolia
      akash: 'sandbox-01', // Akash Sandbox
      osmosis: 'osmo-test-5', // Osmosis Testnet
      ethereum: '11155111', // Sepolia
      arbitrum: '421614', // Arbitrum Sepolia
    };

    const chains = this.network === 'testnet' ? testnetChains : mainnetChains;
    return chains[chain] || chain;
  }

  private getDenom(token: string): string {
    const denoms: Record<string, string> = {
      USDC: 'uusdc',
      ETH: 'wei',
      AKT: 'uakt',
      MOR: 'umor',
      OSMO: 'uosmo',
    };
    return denoms[token] || token.toLowerCase();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
