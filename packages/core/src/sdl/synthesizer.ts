import { stringify } from 'yaml';
import { SealedSecrets } from './secrets.js';
import type { MorpheusConfig } from './types.js';

export interface SDLConfig {
  image: {
    tag: string;
    registry?: string;
  };
  gpu?: string;
  testnet?: boolean;
}

export interface SDLOutput {
  version: string;
  services: Record<string, SDLService>;
  profiles: {
    compute: Record<string, SDLComputeProfile>;
  };
  deployment: Record<string, SDLDeployment>;
  placement: SDLPlacement;
  raw: string;
  estimatedCost: number;
  gpu?: { model: string; units: number };
}

interface SDLService {
  image: string;
  expose: SDLExpose[];
  env?: string[];
  command?: string[];
  params?: {
    storage?: Record<string, { mount: string }>;
  };
  resources: SDLResources;
}

interface SDLExpose {
  port: number;
  as: number;
  to: Array<{ global?: boolean; service?: string }>;
}

interface SDLResources {
  cpu: { units: number };
  memory: { size: string };
  gpu?: {
    units: number;
    attributes: {
      vendor: {
        nvidia: Array<{ model: string }>;
      };
    };
  };
  storage: Array<{
    size: string;
    attributes?: { persistent: boolean };
  }>;
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

interface SDLPlacement {
  akash: {
    pricing: {
      denom: string;
      amount: number;
    };
  };
}

// GPU pricing tiers (approximate hourly rates in AKT)
const GPU_PRICING: Record<string, number> = {
  'nvidia-a100': 2.5,
  'nvidia-h100': 4.0,
  'nvidia-rtx4090': 1.2,
  'nvidia-a10': 0.8,
};

// Base resource pricing
const BASE_PRICING = {
  cpu: 0.01, // per unit/hour
  memory: 0.005, // per GB/hour
  storage: 0.001, // per GB/hour
};

export class SDLSynthesizer {
  private config: MorpheusConfig;
  private secrets: SealedSecrets;

  constructor(config: MorpheusConfig) {
    this.config = config;
    this.secrets = new SealedSecrets();
  }

  async synthesize(options: SDLConfig): Promise<SDLOutput> {
    const services: Record<string, SDLService> = {};
    const profiles: { compute: Record<string, SDLComputeProfile> } = { compute: {} };
    const deployment: Record<string, SDLDeployment> = {};

    // Build main agent service
    const agentService = await this.buildAgentService(options);
    services['agent'] = agentService;
    profiles.compute['agent'] = {
      resources: {
        cpu: { units: agentService.resources.cpu.units },
        memory: { size: agentService.resources.memory.size },
      },
    };
    deployment['agent'] = { profile: 'compute', count: 1 };

    // Add PostgreSQL sidecar for durable execution
    if (this.config.template === 'ai-agent') {
      const postgresService = this.buildPostgresService();
      services['postgres'] = postgresService;
      profiles.compute['postgres'] = {
        resources: {
          cpu: { units: 1 },
          memory: { size: '1Gi' },
        },
      };
      deployment['postgres'] = { profile: 'compute', count: 1 };

      // Add Vector logging sidecar
      const logService = this.buildLogService();
      services['log-shipper'] = logService;
      profiles.compute['log-shipper'] = {
        resources: {
          cpu: { units: 0.1 },
          memory: { size: '128Mi' },
        },
      };
      deployment['log-shipper'] = { profile: 'compute', count: 1 };
    }

    // Calculate pricing
    const estimatedCost = this.calculateCost(services, options.gpu);
    const placement = this.buildPlacement(estimatedCost, options.testnet);

    const sdl: SDLOutput = {
      version: '2.0',
      services,
      profiles,
      deployment,
      placement,
      estimatedCost,
      gpu: options.gpu ? { model: options.gpu, units: 1 } : undefined,
      raw: '',
    };

    // Generate raw YAML
    sdl.raw = this.generateRawSDL(sdl);

    return sdl;
  }

  private async buildAgentService(options: SDLConfig): Promise<SDLService> {
    const cpu = this.config.resources?.cpu || 2;
    const memory = this.config.resources?.memory || '4Gi';
    const storage = this.config.resources?.storage || '10Gi';
    const port = this.config.runtime?.port || 8000;

    // Build environment variables
    const env: string[] = [];

    // Add workflow configuration
    if (this.config.template === 'ai-agent') {
      env.push('WORKFLOW_TARGET_WORLD=@workflow/world-postgres');
      env.push('WORKFLOW_POSTGRES_URL=postgres://postgres:password@postgres:5432/workflow');
    }

    // Add user-defined variables
    if (this.config.env?.variables) {
      for (const [key, value] of Object.entries(this.config.env.variables)) {
        if (key !== 'WORKFLOW_TARGET_WORLD') {
          env.push(`${key}=${value}`);
        }
      }
    }

    // Encrypt and add secrets
    if (this.config.env?.secrets) {
      for (const secretKey of this.config.env.secrets) {
        const encryptedValue = await this.secrets.encrypt(
          secretKey,
          process.env[secretKey] || ''
        );
        env.push(`${secretKey}=${encryptedValue}`);
      }
    }

    const service: SDLService = {
      image: options.image.tag,
      expose: [
        {
          port,
          as: 80,
          to: [{ global: true }],
        },
      ],
      env,
      params: {
        storage: {
          data: { mount: '/app/data' },
        },
      },
      resources: {
        cpu: { units: cpu },
        memory: { size: memory },
        storage: [{ size: storage }],
      },
    };

    // Add GPU if specified
    if (options.gpu || this.config.resources?.gpu) {
      const gpuModel = options.gpu || this.config.resources!.gpu!.model;
      const gpuUnits = this.config.resources?.gpu?.units || 1;

      service.resources.gpu = {
        units: gpuUnits,
        attributes: {
          vendor: {
            nvidia: [{ model: gpuModel.replace('nvidia-', '') }],
          },
        },
      };
    }

    return service;
  }

  private buildPostgresService(): SDLService {
    return {
      image: 'postgres:15-alpine',
      expose: [
        {
          port: 5432,
          as: 5432,
          to: [{ service: 'agent' }],
        },
      ],
      env: [
        'POSTGRES_USER=postgres',
        'POSTGRES_PASSWORD=password',
        'POSTGRES_DB=workflow',
      ],
      params: {
        storage: {
          data: { mount: '/var/lib/postgresql/data' },
        },
      },
      resources: {
        cpu: { units: 1 },
        memory: { size: '1Gi' },
        storage: [
          {
            size: '10Gi',
            attributes: { persistent: true },
          },
        ],
      },
    };
  }

  private buildLogService(): SDLService {
    return {
      image: 'timberio/vector:0.26.0-alpine',
      command: ['vector', '--config', '/etc/vector/vector.toml'],
      expose: [],
      resources: {
        cpu: { units: 0.1 },
        memory: { size: '128Mi' },
        storage: [{ size: '1Gi' }],
      },
    };
  }

  private calculateCost(services: Record<string, SDLService>, gpu?: string): number {
    let totalHourlyCost = 0;

    for (const service of Object.values(services)) {
      // CPU cost
      totalHourlyCost += service.resources.cpu.units * BASE_PRICING.cpu;

      // Memory cost (parse GB from string like "4Gi")
      const memoryGb = this.parseMemoryToGb(service.resources.memory.size);
      totalHourlyCost += memoryGb * BASE_PRICING.memory;

      // Storage cost
      for (const storage of service.resources.storage) {
        const storageGb = this.parseMemoryToGb(storage.size);
        totalHourlyCost += storageGb * BASE_PRICING.storage;
      }

      // GPU cost
      if (service.resources.gpu && gpu) {
        totalHourlyCost += GPU_PRICING[gpu] || 1.0;
      }
    }

    return Math.round(totalHourlyCost * 100) / 100;
  }

  private parseMemoryToGb(size: string): number {
    const match = size.match(/^(\d+(?:\.\d+)?)(Gi|Mi|G|M)?$/);
    if (!match) return 1;

    const value = parseFloat(match[1]!);
    const unit = match[2] || 'Gi';

    switch (unit) {
      case 'Gi':
      case 'G':
        return value;
      case 'Mi':
      case 'M':
        return value / 1024;
      default:
        return value;
    }
  }

  private buildPlacement(estimatedCost: number, testnet?: boolean): SDLPlacement {
    // Calculate bid amount based on estimated cost
    // Add 20% buffer for bid competition
    const bidAmount = Math.ceil(estimatedCost * 1.2 * 1000000); // Convert to uakt

    return {
      akash: {
        pricing: {
          denom: testnet ? 'uakt' : 'uakt',
          amount: bidAmount,
        },
      },
    };
  }

  private generateRawSDL(sdl: Omit<SDLOutput, 'raw' | 'estimatedCost' | 'gpu'>): string {
    const yamlContent = {
      version: sdl.version,
      services: sdl.services,
      profiles: sdl.profiles,
      deployment: sdl.deployment,
      placement: sdl.placement,
    };

    return stringify(yamlContent, {
      indent: 2,
      lineWidth: 0,
    });
  }
}

// Export MorpheusConfig type for external use
export type { MorpheusConfig };
