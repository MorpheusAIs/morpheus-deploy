import { stringify } from 'yaml';
import type { Template, SDLOutput, TemplateConfig } from '../types.js';

export class CustomTemplate implements Template {
  type = 'custom' as const;
  name = 'Custom';
  description = 'Advanced configuration with raw SDL support';

  generate(config: TemplateConfig): SDLOutput {
    const cpu = config.resources?.cpu || 1;
    const memory = config.resources?.memory || '1Gi';
    const storage = config.resources?.storage || '5Gi';
    const port = config.port || 8080;

    // Build environment variables
    const env: string[] = [];

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
      app: {
        image: config.image,
        expose: [
          {
            port,
            as: 80,
            to: [{ global: true }],
          },
        ],
        ...(env.length > 0 && { env }),
        params: {
          storage: {
            data: { mount: '/data' },
          },
        },
      },
    };

    // Add GPU if configured
    const gpuConfig = config.resources?.gpu ? {
      gpu: {
        units: config.resources.gpu.units,
        attributes: {
          vendor: {
            nvidia: [{ model: config.resources.gpu.model.replace('nvidia-', '') }],
          },
        },
      },
    } : {};

    const profiles = {
      compute: {
        app: {
          resources: {
            cpu: { units: cpu },
            memory: { size: memory },
            storage: [
              {
                size: storage,
                attributes: { persistent: true },
              },
            ],
            ...gpuConfig,
          },
        },
      },
      placement: {
        akash: {
          pricing: {
            app: { denom: 'uakt', amount: 5000 },
          },
        },
      },
    };

    const deployment = {
      app: { akash: { profile: 'app', count: 1 } },
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
      type: 'custom',
      resources: {
        cpu: 1,
        memory: '1Gi',
        storage: '5Gi',
      },
      port: 8080,
    };
  }
}
