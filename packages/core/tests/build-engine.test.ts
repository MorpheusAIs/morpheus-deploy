import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BuildEngine, type BuildConfig } from '../src/build/engine';
import { DockerfileGenerator } from '../src/build/dockerfile';
import { FrameworkDetector } from '../src/build/detector';
import type { MorpheusConfig } from '../src/sdl/types';

// Mock fs modules
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    createReadStream: vi.fn().mockReturnValue({
      pipe: vi.fn().mockReturnThis(),
    }),
  };
});

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('FROM node:18'),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

// Mock tar
vi.mock('tar', () => ({
  create: vi.fn().mockResolvedValue(undefined),
}));

// Mock dockerode
vi.mock('dockerode', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      buildImage: vi.fn().mockImplementation(() => {
        const stream = {
          pipe: vi.fn().mockReturnThis(),
          on: vi.fn((event, cb) => {
            if (event === 'end') {
              setTimeout(cb, 10);
            }
            return stream;
          }),
        };
        return Promise.resolve(stream);
      }),
      getImage: vi.fn().mockReturnValue({
        inspect: vi.fn().mockResolvedValue({
          Size: 245000000,
          Id: 'sha256:abc123def456',
          RootFS: { Layers: ['layer1', 'layer2', 'layer3'] },
        }),
        push: vi.fn().mockImplementation(() => {
          const stream = {
            pipe: vi.fn().mockReturnThis(),
            on: vi.fn((event, cb) => {
              if (event === 'end') {
                setTimeout(cb, 10);
              }
              return stream;
            }),
          };
          return Promise.resolve(stream);
        }),
        tag: vi.fn().mockResolvedValue(undefined),
      }),
      modem: {
        followProgress: vi.fn((stream, onFinished) => {
          onFinished(null, []);
        }),
      },
    })),
  };
});

describe('BuildEngine', () => {
  let buildEngine: BuildEngine;

  const morpheusConfig: MorpheusConfig = {
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

  beforeEach(() => {
    vi.clearAllMocks();
    buildEngine = new BuildEngine(morpheusConfig);
  });

  describe('build', () => {
    it('should build Docker image', async () => {
      const options: BuildConfig = {
        context: '/tmp/test-project',
        dockerfile: 'Dockerfile',
      };

      const result = await buildEngine.build(options);

      expect(result).toBeDefined();
      expect(result.tag).toBeDefined();
      expect(typeof result.size).toBe('number');
      expect(typeof result.buildTime).toBe('number');
    });
  });
});

describe('DockerfileGenerator', () => {
  let generator: DockerfileGenerator;

  beforeEach(() => {
    generator = new DockerfileGenerator();
  });

  describe('generate', () => {
    it('should generate Dockerfile for nextjs', async () => {
      const dockerfile = await generator.generate({
        framework: 'nextjs',
        port: 3000,
      });

      expect(dockerfile).toContain('FROM node');
      expect(dockerfile).toContain('EXPOSE');
    });

    it('should generate Dockerfile for node', async () => {
      const dockerfile = await generator.generate({
        framework: 'node',
        port: 8000,
      });

      expect(dockerfile).toContain('FROM node');
    });

    it('should generate Dockerfile for python', async () => {
      const dockerfile = await generator.generate({
        framework: 'python',
        port: 8000,
      });

      expect(dockerfile).toContain('FROM python');
    });
  });
});

describe('FrameworkDetector', () => {
  let detector: FrameworkDetector;

  beforeEach(() => {
    detector = new FrameworkDetector();
  });

  describe('detect', () => {
    it('should detect framework from project', async () => {
      const framework = await detector.detect('/tmp/test-project');

      expect(framework).toBeDefined();
      expect(typeof framework).toBe('string');
    });
  });
});
