import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs/promises';

import { loadConfig, saveConfig, generateMorpheusConfig } from '../src/lib/config';
import type { MorpheusConfig } from '../src/lib/config';

// Mock fs
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

describe('loadConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load config from file', async () => {
    const mockConfig = `
project: test-project
template: ai-agent
provider: akash
resources:
  cpu: 2
  memory: 4Gi
  storage: 10Gi
`;

    vi.mocked(fs.readFile).mockResolvedValue(mockConfig);

    const config = await loadConfig('/path/to/morpheus.yaml');

    expect(config).toBeDefined();
    expect(config.project).toBe('test-project');
    expect(config.template).toBe('ai-agent');
  });

  it('should apply default values', async () => {
    const minimalConfig = `
project: test-project
`;

    vi.mocked(fs.readFile).mockResolvedValue(minimalConfig);

    const config = await loadConfig('/path/to/morpheus.yaml');

    expect(config.template).toBe('ai-agent');
    expect(config.provider).toBe('akash');
    expect(config.resources?.cpu).toBe(2);
    expect(config.resources?.memory).toBe('4Gi');
    expect(config.runtime?.port).toBe(8000);
  });

  it('should preserve user-defined values', async () => {
    const mockConfig = `
project: custom-project
template: mcp-server
provider: render
resources:
  cpu: 4
  memory: 8Gi
  storage: 20Gi
runtime:
  port: 3000
`;

    vi.mocked(fs.readFile).mockResolvedValue(mockConfig);

    const config = await loadConfig('/path/to/morpheus.yaml');

    expect(config.project).toBe('custom-project');
    expect(config.template).toBe('mcp-server');
    expect(config.provider).toBe('render');
    expect(config.resources?.cpu).toBe(4);
    expect(config.runtime?.port).toBe(3000);
  });

  it('should throw on file read error', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

    await expect(loadConfig('/nonexistent/morpheus.yaml')).rejects.toThrow();
  });
});

describe('saveConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should save config to file', async () => {
    const config: MorpheusConfig = {
      project: 'test-project',
      template: 'ai-agent',
      provider: 'akash',
      resources: {
        cpu: 2,
        memory: '4Gi',
        storage: '10Gi',
      },
      runtime: {
        port: 8000,
      },
    };

    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    await saveConfig('/path/to/morpheus.yaml', config);

    expect(fs.writeFile).toHaveBeenCalledWith(
      '/path/to/morpheus.yaml',
      expect.stringContaining('project'),
      'utf-8'
    );
  });

  it('should produce valid YAML', async () => {
    const config: MorpheusConfig = {
      project: 'yaml-test',
      template: 'website',
      provider: 'akash',
    };

    let savedContent = '';
    vi.mocked(fs.writeFile).mockImplementation(async (_, content) => {
      savedContent = content as string;
    });

    await saveConfig('/path/to/morpheus.yaml', config);

    expect(savedContent).toContain('project: yaml-test');
    expect(savedContent).toContain('template: website');
  });
});

describe('generateMorpheusConfig', () => {
  it('should generate config from options', () => {
    const options = {
      projectName: 'my-project',
      template: 'ai-agent',
      funding: {
        sourceToken: 'USDC',
        autoTopUp: true,
        threshold: 0.1,
        split: { staking: 0.6, compute: 0.4 },
      },
    };

    const yaml = generateMorpheusConfig(options);

    expect(yaml).toContain('project: "my-project"');
    expect(yaml).toContain('template: "ai-agent"');
    expect(yaml).toContain('provider: "akash"');
  });

  it('should include GPU config when specified', () => {
    const options = {
      projectName: 'gpu-project',
      template: 'ai-agent',
      gpu: { model: 'nvidia-a100', units: 1 },
      funding: {
        sourceToken: 'USDC',
        autoTopUp: true,
        threshold: 0.1,
        split: { staking: 0.6, compute: 0.4 },
      },
    };

    const yaml = generateMorpheusConfig(options);

    expect(yaml).toContain('gpu:');
    expect(yaml).toContain('model: "nvidia-a100"');
    expect(yaml).toContain('units: 1');
    expect(yaml).toContain('cpu: 4'); // GPU projects get more CPU
  });

  it('should set defaults without GPU', () => {
    const options = {
      projectName: 'basic-project',
      template: 'website',
      funding: {
        sourceToken: 'USDC',
        autoTopUp: false,
        threshold: 0.1,
        split: { staking: 0.5, compute: 0.5 },
      },
    };

    const yaml = generateMorpheusConfig(options);

    expect(yaml).toContain('tier: "medium"');
    expect(yaml).toContain('cpu: 2');
    expect(yaml).toContain('memory: "4Gi"');
  });

  it('should include funding configuration', () => {
    const options = {
      projectName: 'funded-project',
      template: 'ai-agent',
      funding: {
        sourceToken: 'ETH',
        autoTopUp: true,
        threshold: 0.2,
        split: { staking: 0.7, compute: 0.3 },
      },
    };

    const yaml = generateMorpheusConfig(options);

    expect(yaml).toContain('funding:');
    expect(yaml).toContain('sourceToken: "ETH"');
    expect(yaml).toContain('autoTopUp: true');
    expect(yaml).toContain('threshold: 0.2');
    expect(yaml).toContain('staking: 0.7');
  });

  it('should include comments and documentation', () => {
    const options = {
      projectName: 'documented-project',
      template: 'ai-agent',
      funding: {
        sourceToken: 'USDC',
        autoTopUp: true,
        threshold: 0.1,
        split: { staking: 0.6, compute: 0.4 },
      },
    };

    const yaml = generateMorpheusConfig(options);

    expect(yaml).toContain('# Morpheus Project Configuration');
    expect(yaml).toContain('# Project Metadata');
    expect(yaml).toContain('# Funding and Economic Strategy');
  });
});
