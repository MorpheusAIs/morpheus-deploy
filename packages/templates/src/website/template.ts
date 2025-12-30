import { stringify } from 'yaml';
import type { Template, SDLOutput, TemplateConfig } from '../types.js';

export class WebsiteTemplate implements Template {
  type = 'website' as const;
  name = 'Website';
  description = 'Decentralized frontend or web application';

  generate(config: TemplateConfig): SDLOutput {
    const cpu = config.resources?.cpu || 0.5;
    const memory = config.resources?.memory || '512Mi';
    const storage = config.resources?.storage || '1Gi';
    const port = config.port || 80;

    // Build environment variables
    const env: string[] = [
      'NODE_ENV=production',
    ];

    if (config.env) {
      for (const [key, value] of Object.entries(config.env)) {
        env.push(`${key}=${value}`);
      }
    }

    const services: Record<string, unknown> = {
      // Web server service
      web: {
        image: config.image,
        expose: [
          {
            port,
            as: 80,
            to: [{ global: true }],
            accept: ['www.example.com'], // Customize domain
          },
        ],
        env,
      },
    };

    const profiles = {
      compute: {
        web: {
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
            web: { denom: 'uakt', amount: 1000 },
          },
        },
      },
    };

    const deployment = {
      web: { akash: { profile: 'web', count: 1 } },
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
      type: 'website',
      resources: {
        cpu: 0.5,
        memory: '512Mi',
        storage: '1Gi',
      },
      port: 80,
    };
  }
}
