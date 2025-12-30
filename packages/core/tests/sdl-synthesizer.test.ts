import { describe, it, expect } from 'vitest';

import { SDLSynthesizer, type SDLConfig } from '../src/sdl/synthesizer';
import type { MorpheusConfig } from '../src/sdl/types';

describe('SDLSynthesizer', () => {
  const baseMorpheusConfig: MorpheusConfig = {
    project: 'test-project',
    template: 'ai-agent',
    provider: 'akash',
    resources: {
      cpu: 2,
      memory: '4Gi',
      storage: '10Gi',
    },
    env: {
      variables: {
        NODE_ENV: 'production',
      },
    },
    runtime: {
      port: 8000,
    },
  };

  describe('synthesize', () => {
    it('should generate basic SDL structure', async () => {
      const synthesizer = new SDLSynthesizer(baseMorpheusConfig);
      const config: SDLConfig = {
        image: {
          tag: 'test-project:latest',
        },
      };

      const result = await synthesizer.synthesize(config);

      expect(result).toBeDefined();
      expect(result.version).toBe('2.0');
      expect(result.services).toBeDefined();
      expect(result.profiles).toBeDefined();
      expect(result.deployment).toBeDefined();
      expect(result.raw).toBeDefined();
    });

    it('should include postgres sidecar for ai-agent template', async () => {
      const synthesizer = new SDLSynthesizer({
        ...baseMorpheusConfig,
        template: 'ai-agent',
      });
      const config: SDLConfig = {
        image: { tag: 'test:latest' },
      };

      const result = await synthesizer.synthesize(config);

      expect(result.services.postgres).toBeDefined();
      expect(result.services['log-shipper']).toBeDefined();
    });

    it('should not include postgres for non-agent templates', async () => {
      const synthesizer = new SDLSynthesizer({
        ...baseMorpheusConfig,
        template: 'website',
      });
      const config: SDLConfig = {
        image: { tag: 'test:latest' },
      };

      const result = await synthesizer.synthesize(config);

      expect(result.services.postgres).toBeUndefined();
    });

    it('should include GPU when specified', async () => {
      const synthesizer = new SDLSynthesizer({
        ...baseMorpheusConfig,
        resources: {
          cpu: 4,
          memory: '16Gi',
          storage: '50Gi',
          gpu: {
            model: 'nvidia-a100',
            units: 1,
          },
        },
      });
      const config: SDLConfig = {
        image: { tag: 'test:latest' },
        gpu: 'nvidia-a100',
      };

      const result = await synthesizer.synthesize(config);

      expect(result.gpu).toBeDefined();
      expect(result.gpu?.model).toBe('nvidia-a100');
    });

    it('should generate raw YAML output', async () => {
      const synthesizer = new SDLSynthesizer(baseMorpheusConfig);
      const config: SDLConfig = {
        image: { tag: 'test:latest' },
      };

      const result = await synthesizer.synthesize(config);

      expect(result.raw).toBeDefined();
      expect(typeof result.raw).toBe('string');
      expect(result.raw).toContain('version');
      expect(result.raw).toContain('services');
    });

    it('should calculate estimated cost', async () => {
      const synthesizer = new SDLSynthesizer(baseMorpheusConfig);
      const config: SDLConfig = {
        image: { tag: 'test:latest' },
      };

      const result = await synthesizer.synthesize(config);

      expect(typeof result.estimatedCost).toBe('number');
      expect(result.estimatedCost).toBeGreaterThan(0);
    });
  });
});

describe('SDLOutput', () => {
  it('should have correct structure', async () => {
    const synthesizer = new SDLSynthesizer({
      project: 'test',
      template: 'ai-agent',
      provider: 'akash',
      resources: { cpu: 1, memory: '1Gi', storage: '5Gi' },
      runtime: { port: 8000 },
    });

    const result = await synthesizer.synthesize({
      image: { tag: 'test:v1' },
    });

    // Check structure
    expect(result.version).toBe('2.0');
    expect(typeof result.services).toBe('object');
    expect(typeof result.profiles).toBe('object');
    expect(typeof result.deployment).toBe('object');
  });
});
