export type TemplateType = 'ai-agent' | 'mcp-server' | 'website' | 'custom';

export interface TemplateConfig {
  type: TemplateType;
  projectName: string;
  image: string;
  resources?: {
    cpu?: number;
    memory?: string;
    storage?: string;
    gpu?: {
      model: string;
      units: number;
    };
  };
  env?: Record<string, string>;
  secrets?: string[];
  port?: number;
}

export interface Template {
  type: TemplateType;
  name: string;
  description: string;

  /**
   * Generate SDL output from configuration
   */
  generate(config: TemplateConfig): SDLOutput;

  /**
   * Get default configuration values
   */
  getDefaults(): Partial<TemplateConfig>;
}

export interface SDLOutput {
  version: string;
  services: Record<string, SDLService>;
  profiles: {
    compute: Record<string, SDLComputeProfile>;
    placement: Record<string, SDLPlacementProfile>;
  };
  deployment: Record<string, SDLDeployment>;
  raw: string;
}

export interface SDLService {
  image: string;
  expose: SDLExpose[];
  env?: string[];
  command?: string[];
  args?: string[];
  params?: {
    storage?: Record<string, { mount: string }>;
  };
}

export interface SDLExpose {
  port: number;
  as: number;
  proto?: 'tcp' | 'udp';
  to: Array<{
    global?: boolean;
    service?: string;
  }>;
  accept?: string[];
}

export interface SDLComputeProfile {
  resources: {
    cpu: { units: number };
    memory: { size: string };
    storage: Array<{
      size: string;
      attributes?: {
        persistent?: boolean;
        class?: string;
      };
    }>;
    gpu?: {
      units: number;
      attributes: {
        vendor: {
          nvidia: Array<{ model: string }>;
        };
      };
    };
  };
}

export interface SDLPlacementProfile {
  pricing: {
    [serviceName: string]: {
      denom: string;
      amount: number;
    };
  };
}

export interface SDLDeployment {
  [placementName: string]: {
    profile: string;
    count: number;
  };
}
