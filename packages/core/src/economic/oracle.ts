export interface PriceData {
  price: number;
  timestamp: number;
  source: string;
}

export interface PriceHistory {
  prices: Array<{ price: number; timestamp: number }>;
  high24h: number;
  low24h: number;
  change24h: number;
}

export class PriceOracle {
  private cache: Map<string, { data: PriceData; expiry: number }> = new Map();
  private cacheTTL: number = 60000; // 1 minute

  /**
   * Get current price for a token pair
   */
  async getPrice(base: string, quote: string): Promise<number> {
    const cacheKey = `${base}/${quote}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.data.price;
    }

    const priceData = await this.fetchPrice(base, quote);

    this.cache.set(cacheKey, {
      data: priceData,
      expiry: Date.now() + this.cacheTTL,
    });

    return priceData.price;
  }

  /**
   * Get price history for a token pair
   */
  async getPriceHistory(base: string, quote: string, days: number = 7): Promise<PriceHistory> {
    const prices = await this.fetchPriceHistory(base, quote, days);

    const priceValues = prices.map(p => p.price);
    const high24h = Math.max(...priceValues.slice(-24));
    const low24h = Math.min(...priceValues.slice(-24));
    const change24h = prices.length >= 2
      ? ((prices[prices.length - 1]!.price - prices[prices.length - 25]!.price) / prices[prices.length - 25]!.price) * 100
      : 0;

    return {
      prices,
      high24h,
      low24h,
      change24h,
    };
  }

  /**
   * Calculate cost estimate in USDC for AKT amount
   */
  async calculateCost(aktAmount: number): Promise<number> {
    const aktPrice = await this.getPrice('AKT', 'USDC');
    return aktAmount * aktPrice;
  }

  /**
   * Get multiple prices at once
   */
  async getPrices(pairs: Array<{ base: string; quote: string }>): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    await Promise.all(
      pairs.map(async ({ base, quote }) => {
        const price = await this.getPrice(base, quote);
        results.set(`${base}/${quote}`, price);
      })
    );

    return results;
  }

  private async fetchPrice(base: string, quote: string): Promise<PriceData> {
    // Try multiple price sources
    const sources = [
      () => this.fetchFromCoingecko(base, quote),
      () => this.fetchFromCoinMarketCap(base, quote),
      () => this.fetchFromOsmosis(base, quote),
    ];

    for (const source of sources) {
      try {
        return await source();
      } catch {
        continue;
      }
    }

    throw new Error(`Failed to fetch price for ${base}/${quote}`);
  }

  private async fetchFromCoingecko(base: string, quote: string): Promise<PriceData> {
    const tokenIds: Record<string, string> = {
      AKT: 'akash-network',
      MOR: 'morpheus-network',
      USDC: 'usd-coin',
      ETH: 'ethereum',
      OSMO: 'osmosis',
    };

    const baseId = tokenIds[base];
    const quoteId = quote.toLowerCase();

    if (!baseId) {
      throw new Error(`Unknown token: ${base}`);
    }

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${baseId}&vs_currencies=${quoteId}`
    );

    if (!response.ok) {
      throw new Error(`Coingecko API error: ${response.statusText}`);
    }

    const data = await response.json() as Record<string, Record<string, number>>;
    const price = data[baseId]?.[quoteId];

    if (!price) {
      throw new Error(`Price not found for ${base}/${quote}`);
    }

    return {
      price,
      timestamp: Date.now(),
      source: 'coingecko',
    };
  }

  private async fetchFromCoinMarketCap(_base: string, _quote: string): Promise<PriceData> {
    // Placeholder for CoinMarketCap API integration
    // Would require API key
    throw new Error('CoinMarketCap not implemented');
  }

  private async fetchFromOsmosis(base: string, quote: string): Promise<PriceData> {
    // Fetch from Osmosis DEX for Cosmos tokens
    const poolIds: Record<string, string> = {
      'AKT/USDC': '1',
      'OSMO/USDC': '678',
    };

    const poolId = poolIds[`${base}/${quote}`];
    if (!poolId) {
      throw new Error(`No Osmosis pool for ${base}/${quote}`);
    }

    const response = await fetch(
      `https://api-osmosis.imperator.co/pools/v2/${poolId}`
    );

    if (!response.ok) {
      throw new Error(`Osmosis API error: ${response.statusText}`);
    }

    const data = await response.json() as { token0Price?: string; token1Price?: string };

    return {
      price: parseFloat(data.token0Price || data.token1Price || '0'),
      timestamp: Date.now(),
      source: 'osmosis',
    };
  }

  private async fetchPriceHistory(
    base: string,
    quote: string,
    days: number
  ): Promise<Array<{ price: number; timestamp: number }>> {
    const tokenIds: Record<string, string> = {
      AKT: 'akash-network',
      MOR: 'morpheus-network',
    };

    const baseId = tokenIds[base];
    if (!baseId) {
      throw new Error(`Unknown token: ${base}`);
    }

    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${baseId}/market_chart?vs_currency=${quote.toLowerCase()}&days=${days}`
    );

    if (!response.ok) {
      throw new Error(`Coingecko API error: ${response.statusText}`);
    }

    const data = await response.json() as { prices: Array<[number, number]> };

    return data.prices.map(([timestamp, price]) => ({
      timestamp,
      price,
    }));
  }
}
