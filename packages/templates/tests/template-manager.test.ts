import { describe, it, expect, beforeEach } from 'vitest';

import { TemplateManager } from '../src/manager';
import type { TemplateConfig } from '../src/types';

describe('TemplateManager', () => {
  let manager: TemplateManager;

  beforeEach(() => {
    manager = new TemplateManager();
  });

  describe('getTemplate', () => {
    it('should return ai-agent template', () => {
      const template = manager.getTemplate('ai-agent');

      expect(template).toBeDefined();
      expect(template.type).toBe('ai-agent');
      expect(template.name).toBe('AI Agent');
    });

    it('should return mcp-server template', () => {
      const template = manager.getTemplate('mcp-server');

      expect(template).toBeDefined();
      expect(template.type).toBe('mcp-server');
      expect(template.name).toBe('MCP Server');
    });

    it('should return website template', () => {
      const template = manager.getTemplate('website');

      expect(template).toBeDefined();
      expect(template.type).toBe('website');
      expect(template.name).toBe('Website');
    });

    it('should return custom template', () => {
      const template = manager.getTemplate('custom');

      expect(template).toBeDefined();
      expect(template.type).toBe('custom');
      expect(template.name).toBe('Custom');
    });

    it('should throw for unknown template', () => {
      expect(() => manager.getTemplate('unknown' as any)).toThrow('Unknown template type');
    });
  });

  describe('listTemplates', () => {
    it('should return all available templates', () => {
      const templates = manager.listTemplates();

      expect(templates).toHaveLength(4);
      expect(templates.map(t => t.type)).toContain('ai-agent');
      expect(templates.map(t => t.type)).toContain('mcp-server');
      expect(templates.map(t => t.type)).toContain('website');
      expect(templates.map(t => t.type)).toContain('custom');
    });
  });

  describe('generateSDL', () => {
    it('should generate SDL for ai-agent template', () => {
      const config: TemplateConfig = {
        type: 'ai-agent',
        projectName: 'my-agent',
        image: 'my-agent:latest',
        resources: {
          cpu: 2,
          memory: '4Gi',
          storage: '10Gi',
          gpu: {
            model: 'nvidia-rtx4090',
            units: 1,
          },
        },
        env: {
          ANTHROPIC_API_KEY: 'sk-test',
        },
      };

      const sdl = manager.generateSDL(config);

      expect(sdl).toBeDefined();
      expect(sdl.version).toBe('2.0');
      expect(sdl.services.postgres).toBeDefined();
      expect(sdl.services['log-shipper']).toBeDefined();
      expect(sdl.raw).toContain('version');
    });

    it('should generate SDL for mcp-server template', () => {
      const config: TemplateConfig = {
        type: 'mcp-server',
        projectName: 'my-mcp',
        image: 'my-mcp:latest',
        resources: {
          cpu: 1,
          memory: '512Mi',
          storage: '1Gi',
        },
        env: {},
      };

      const sdl = manager.generateSDL(config);

      expect(sdl).toBeDefined();
      expect(sdl.version).toBe('2.0');
      expect(sdl.services.postgres).toBeUndefined();
    });

    it('should generate SDL for website template', () => {
      const config: TemplateConfig = {
        type: 'website',
        projectName: 'my-site',
        image: 'my-site:latest',
        resources: {
          cpu: 1,
          memory: '256Mi',
          storage: '500Mi',
        },
        env: {},
      };

      const sdl = manager.generateSDL(config);

      expect(sdl).toBeDefined();
      expect(sdl.profiles.compute['web']).toBeDefined();
    });
  });

  describe('validateConfig', () => {
    it('should pass valid config', () => {
      const config: TemplateConfig = {
        type: 'ai-agent',
        projectName: 'my-agent',
        image: 'my-agent:latest',
      };

      const result = manager.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail on missing projectName', () => {
      const config = {
        type: 'ai-agent',
        projectName: '',
        image: 'my-agent:latest',
      } as TemplateConfig;

      const result = manager.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project name is required');
    });

    it('should fail on missing image', () => {
      const config = {
        type: 'ai-agent',
        projectName: 'my-agent',
        image: '',
      } as TemplateConfig;

      const result = manager.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Container image is required');
    });

    it('should validate GPU model for ai-agent', () => {
      const config: TemplateConfig = {
        type: 'ai-agent',
        projectName: 'my-agent',
        image: 'my-agent:latest',
        resources: {
          gpu: {
            model: 'invalid-gpu',
            units: 1,
          },
        },
      };

      const result = manager.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid GPU model'))).toBe(true);
    });
  });

  describe('getDefaultConfig', () => {
    it('should return defaults for ai-agent', () => {
      const defaults = manager.getDefaultConfig('ai-agent');

      expect(defaults.type).toBe('ai-agent');
      expect(defaults.resources?.cpu).toBe(4);
      expect(defaults.resources?.gpu).toBeDefined();
    });

    it('should return defaults for mcp-server', () => {
      const defaults = manager.getDefaultConfig('mcp-server');

      expect(defaults.type).toBe('mcp-server');
      expect(defaults.resources?.cpu).toBe(2);
    });

    it('should return defaults for website', () => {
      const defaults = manager.getDefaultConfig('website');

      expect(defaults.type).toBe('website');
      expect(defaults.port).toBe(80);
    });
  });
});

describe('AI Agent Template', () => {
  let manager: TemplateManager;

  beforeEach(() => {
    manager = new TemplateManager();
  });

  it('should have GPU in defaults', () => {
    const defaults = manager.getDefaultConfig('ai-agent');
    expect(defaults.resources?.gpu).toBeDefined();
    expect(defaults.resources?.gpu?.units).toBe(1);
  });

  it('should include postgres sidecar in generated SDL', () => {
    const config: TemplateConfig = {
      type: 'ai-agent',
      projectName: 'my-agent',
      image: 'my-agent:latest',
    };

    const sdl = manager.generateSDL(config);

    expect(sdl.services.postgres).toBeDefined();
  });

  it('should include vector logging sidecar', () => {
    const config: TemplateConfig = {
      type: 'ai-agent',
      projectName: 'my-agent',
      image: 'my-agent:latest',
    };

    const sdl = manager.generateSDL(config);

    expect(sdl.services['log-shipper']).toBeDefined();
  });

  it('should include DATABASE_URL env var', () => {
    const config: TemplateConfig = {
      type: 'ai-agent',
      projectName: 'my-agent',
      image: 'my-agent:latest',
    };

    const sdl = manager.generateSDL(config);

    const agentService = sdl.services.agent as { env: string[] };
    expect(agentService.env.some((e: string) => e.includes('WORKFLOW_POSTGRES_URL'))).toBe(true);
  });
});

describe('MCP Server Template', () => {
  let manager: TemplateManager;

  beforeEach(() => {
    manager = new TemplateManager();
  });

  it('should have minimal resources', () => {
    const defaults = manager.getDefaultConfig('mcp-server');
    expect(defaults.resources?.cpu).toBeLessThanOrEqual(2);
    expect(defaults.resources?.memory).toBe('2Gi');
  });

  it('should not have GPU in defaults', () => {
    const defaults = manager.getDefaultConfig('mcp-server');
    expect(defaults.resources?.gpu).toBeUndefined();
  });

  it('should not include postgres sidecar', () => {
    const config: TemplateConfig = {
      type: 'mcp-server',
      projectName: 'my-mcp',
      image: 'my-mcp:latest',
    };

    const sdl = manager.generateSDL(config);

    expect(sdl.services.postgres).toBeUndefined();
  });
});

describe('Website Template', () => {
  let manager: TemplateManager;

  beforeEach(() => {
    manager = new TemplateManager();
  });

  it('should have minimal resources', () => {
    const defaults = manager.getDefaultConfig('website');
    expect(defaults.resources?.cpu).toBeLessThanOrEqual(1);
  });

  it('should expose port 80', () => {
    const config: TemplateConfig = {
      type: 'website',
      projectName: 'my-site',
      image: 'my-site:latest',
    };

    const sdl = manager.generateSDL(config);

    const webService = sdl.services.web as { expose: Array<{ as: number }> };
    expect(webService.expose[0].as).toBe(80);
  });
});

describe('Custom Template', () => {
  let manager: TemplateManager;

  beforeEach(() => {
    manager = new TemplateManager();
  });

  it('should accept any valid base config', () => {
    const config: TemplateConfig = {
      type: 'custom',
      projectName: 'my-app',
      image: 'my-app:latest',
    };

    const result = manager.validateConfig(config);

    expect(result.valid).toBe(true);
  });

  it('should generate SDL for custom config', () => {
    const config: TemplateConfig = {
      type: 'custom',
      projectName: 'my-app',
      image: 'my-app:latest',
      resources: {
        cpu: 1,
        memory: '1Gi',
        storage: '5Gi',
      },
    };

    const sdl = manager.generateSDL(config);

    expect(sdl).toBeDefined();
    expect(sdl.version).toBe('2.0');
  });
});
