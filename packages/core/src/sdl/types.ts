export interface MorpheusConfig {
  project: string;
  template: 'ai-agent' | 'mcp-server' | 'website' | 'custom';
  provider: 'akash' | 'render' | 'filecoin';
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
