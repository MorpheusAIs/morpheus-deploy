import { describe, it, expect } from 'vitest';

import { SDLValidator } from '../src/sdl/validator';
import type { SDLOutput } from '../src/sdl/synthesizer';

describe('SDLValidator', () => {
  const validator = new SDLValidator();

  const createValidSDL = (): SDLOutput => ({
    version: '2.0',
    services: {
      agent: {
        image: 'my-app:latest',
        expose: [
          {
            port: 8000,
            as: 80,
            to: [{ global: true }],
          },
        ],
        env: ['NODE_ENV=production'],
        resources: {
          cpu: { units: 2 },
          memory: { size: '4Gi' },
          storage: [{ size: '10Gi' }],
        },
      },
    },
    profiles: {
      compute: {
        agent: {
          resources: {
            cpu: { units: 2 },
            memory: { size: '4Gi' },
          },
        },
      },
    },
    deployment: {
      agent: {
        profile: 'agent',
        count: 1,
      },
    },
    placement: {
      akash: {
        attributes: { region: 'us-west' },
        pricing: {
          agent: { denom: 'uakt', amount: 10000 },
        },
      },
    },
    raw: 'version: "2.0"',
    estimatedCost: 100,
  });

  describe('validate', () => {
    it('should pass valid SDL', () => {
      const sdl = createValidSDL();
      const result = validator.validate(sdl);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail on invalid version', () => {
      const sdl = createValidSDL();
      sdl.version = '1.0';

      const result = validator.validate(sdl);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_VERSION')).toBe(true);
    });

    it('should fail on missing services', () => {
      const sdl = createValidSDL();
      sdl.services = {};

      const result = validator.validate(sdl);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'NO_SERVICES')).toBe(true);
    });

    it('should fail on missing image', () => {
      const sdl = createValidSDL();
      (sdl.services.agent as any).image = '';

      const result = validator.validate(sdl);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_IMAGE')).toBe(true);
    });

    it('should fail on missing resources', () => {
      const sdl = createValidSDL();
      delete (sdl.services.agent as any).resources;

      const result = validator.validate(sdl);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_RESOURCES')).toBe(true);
    });

    it('should fail on invalid CPU units', () => {
      const sdl = createValidSDL();
      sdl.services.agent.resources.cpu.units = 0;

      const result = validator.validate(sdl);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_CPU')).toBe(true);
    });

    it('should fail on missing memory', () => {
      const sdl = createValidSDL();
      delete (sdl.services.agent.resources as any).memory;

      const result = validator.validate(sdl);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_MEMORY')).toBe(true);
    });

    it('should fail on missing placement pricing', () => {
      const sdl = createValidSDL();
      delete (sdl.placement as any).akash;

      const result = validator.validate(sdl);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_PRICING')).toBe(true);
    });

    it('should warn on no exposed ports', () => {
      const sdl = createValidSDL();
      sdl.services.agent.expose = [];

      const result = validator.validate(sdl);

      expect(result.warnings.some(w => w.code === 'NO_EXPOSED_PORTS')).toBe(true);
    });

    it('should warn on high CPU usage', () => {
      const sdl = createValidSDL();
      sdl.services.agent.resources.cpu.units = 20;

      const result = validator.validate(sdl);

      expect(result.warnings.some(w => w.code === 'HIGH_CPU_USAGE')).toBe(true);
    });
  });

  describe('validateEnvironment', () => {
    it('should pass clean environment', () => {
      const result = validator.validateEnvironment([
        'NODE_ENV=production',
        'PORT=8000',
      ]);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn on unencrypted secrets', () => {
      const result = validator.validateEnvironment([
        'API_KEY=plaintext-value',
        'DATABASE_PASSWORD=secret123',
      ]);

      expect(result.warnings.some(w => w.code === 'UNENCRYPTED_SECRET')).toBe(true);
    });

    it('should not warn on encrypted secrets', () => {
      const result = validator.validateEnvironment([
        'API_KEY=enc:encrypted-value',
        'DATABASE_PASSWORD=enc:another-encrypted',
      ]);

      expect(result.warnings.filter(w => w.code === 'UNENCRYPTED_SECRET')).toHaveLength(0);
    });

    it('should warn on whitespace-only values', () => {
      // Note: EMPTY_VAR= with no value is skipped by the validator
      // But whitespace-only values like '   ' are detected
      const result = validator.validateEnvironment([
        'WHITESPACE_VAR=   ',
      ]);

      expect(result.warnings.some(w => w.code === 'EMPTY_ENV_VALUE')).toBe(true);
    });
  });
});
