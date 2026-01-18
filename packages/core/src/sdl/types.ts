export interface MorpheusConfig {
  project: string;
  template: 'ai-agent' | 'mcp-server' | 'website' | 'custom';
  provider: 'akash' | 'render' | 'filecoin';
  network?: 'mainnet' | 'testnet';
  funding?: FundingConfig;
  resources?: ResourceConfig;
  runtime?: RuntimeConfig;
  env?: EnvironmentConfig;
}

export interface FundingConfig {
  wallet?: string;
  sourceToken: string;
  autoTopUp: boolean;
  threshold: number;
  /**
   * Duration for initial deployment funding.
   * Supports: y (years), m (months), w (weeks), d (days)
   * Examples: "1y", "6m", "30d"
   * Default: "1y" (1 year)
   */
  duration?: string;
  split: {
    staking: number;
    compute: number;
  };
}

export interface ResourceConfig {
  tier?: 'small' | 'medium' | 'large' | 'custom';
  cpu?: number;
  memory?: string;
  storage?: string;
  gpu?: {
    units: number;
    model: string;
  };
}

export interface RuntimeConfig {
  image?: string;
  port?: number;
  framework?: 'nextjs' | 'express' | 'node';
}

export interface EnvironmentConfig {
  variables?: Record<string, string>;
  secrets?: string[];
}
