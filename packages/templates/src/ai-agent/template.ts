import { stringify } from 'yaml';
import type { Template, SDLOutput, TemplateConfig } from '../types.js';

export class AIAgentTemplate implements Template {
  type = 'ai-agent' as const;
  name = 'AI Agent';
  description = 'Long-running autonomous AI workflow with durable execution and GPU support';

  generate(config: TemplateConfig): SDLOutput {
    const cpu = config.resources?.cpu || 4;
    const memory = config.resources?.memory || '8Gi';
    const storage = config.resources?.storage || '20Gi';
    const port = config.port || 8000;

    // Build environment variables
    const env: string[] = [
      'WORKFLOW_TARGET_WORLD=@workflow/world-postgres',
      'WORKFLOW_POSTGRES_URL=postgres://postgres:password@postgres:5432/workflow',
      'NODE_ENV=production',
    ];

    if (config.env) {
      for (const [key, value] of Object.entries(config.env)) {
        env.push(`${key}=${value}`);
      }
    }

    if (config.secrets) {
      for (const secret of config.secrets) {
        env.push(`${secret}=\${${secret}}`);
      }
    }

    const services: Record<string, unknown> = {
      // Primary AI Agent service
      agent: {
        image: config.image,
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
      },

      // PostgreSQL sidecar for durable execution
      postgres: {
        image: 'postgres:15-alpine',
        expose: [
          {
            port: 5432,
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
      },

      // Vector logging sidecar
      'log-shipper': {
        image: 'timberio/vector:0.26.0-alpine',
        command: ['vector', '--config', '/etc/vector/vector.toml'],
      },
    };

    const profiles = {
      compute: {
        agent: {
          resources: {
            cpu: { units: cpu },
            memory: { size: memory },
            storage: [{ size: storage }],
            ...(config.resources?.gpu && {
              gpu: {
                units: config.resources.gpu.units,
                attributes: {
                  vendor: {
                    nvidia: [{ model: config.resources.gpu.model.replace('nvidia-', '') }],
                  },
                },
              },
            }),
          },
        },
        postgres: {
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
        },
        'log-shipper': {
          resources: {
            cpu: { units: 0.1 },
            memory: { size: '128Mi' },
            storage: [{ size: '1Gi' }],
          },
        },
      },
      placement: {
        akash: {
          pricing: {
            agent: { denom: 'uakt', amount: 10000 },
            postgres: { denom: 'uakt', amount: 1000 },
            'log-shipper': { denom: 'uakt', amount: 100 },
          },
        },
      },
    };

    const deployment = {
      agent: { akash: { profile: 'agent', count: 1 } },
      postgres: { akash: { profile: 'postgres', count: 1 } },
      'log-shipper': { akash: { profile: 'log-shipper', count: 1 } },
    };

    const sdl = {
      version: '2.0',
      services,
      profiles,
      deployment,
    };

    return {
      version: '2.0',
      services: services as SDLOutput['services'],
      profiles: profiles as SDLOutput['profiles'],
      deployment: deployment as SDLOutput['deployment'],
      raw: stringify(sdl, { indent: 2, lineWidth: 0 }),
    };
  }

  getDefaults(): Partial<TemplateConfig> {
    return {
      type: 'ai-agent',
      resources: {
        cpu: 4,
        memory: '8Gi',
        storage: '20Gi',
        gpu: {
          model: 'nvidia-a100',
          units: 1,
        },
      },
      port: 8000,
    };
  }
}
