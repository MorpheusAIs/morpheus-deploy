import { stringify } from 'yaml';
import type { Template, SDLOutput, TemplateConfig } from '../types.js';

export class MCPServerTemplate implements Template {
  type = 'mcp-server' as const;
  name = 'MCP Server';
  description = 'Model Context Protocol server for secure data pipelines';

  generate(config: TemplateConfig): SDLOutput {
    const cpu = config.resources?.cpu || 2;
    const memory = config.resources?.memory || '2Gi';
    const storage = config.resources?.storage || '5Gi';
    const port = config.port || 3000;

    // Build environment variables
    const env: string[] = [
      'NODE_ENV=production',
      `PORT=${port}`,
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
      // MCP Server service
      'mcp-server': {
        image: config.image,
        expose: [
          {
            port,
            as: 80,
            to: [{ global: true }],
          },
          {
            port: 3001, // Health check port
            as: 3001,
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
    };

    const profiles = {
      compute: {
        'mcp-server': {
          resources: {
            cpu: { units: cpu },
            memory: { size: memory },
            storage: [{ size: storage }],
          },
        },
      },
      placement: {
        akash: {
          pricing: {
            'mcp-server': { denom: 'uakt', amount: 5000 },
          },
        },
      },
    };

    const deployment = {
      'mcp-server': { akash: { profile: 'mcp-server', count: 1 } },
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
      type: 'mcp-server',
      resources: {
        cpu: 2,
        memory: '2Gi',
        storage: '5Gi',
      },
      port: 3000,
    };
  }
}
