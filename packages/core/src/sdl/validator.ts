import type { SDLOutput } from './synthesizer.js';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

export class SDLValidator {
  validate(sdl: SDLOutput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate version
    if (sdl.version !== '2.0') {
      errors.push({
        code: 'INVALID_VERSION',
        message: `SDL version must be "2.0", got "${sdl.version}"`,
        path: 'version',
      });
    }

    // Validate services
    if (!sdl.services || Object.keys(sdl.services).length === 0) {
      errors.push({
        code: 'NO_SERVICES',
        message: 'SDL must define at least one service',
        path: 'services',
      });
    }

    for (const [name, service] of Object.entries(sdl.services)) {
      // Validate image
      if (!service.image) {
        errors.push({
          code: 'MISSING_IMAGE',
          message: `Service "${name}" must specify an image`,
          path: `services.${name}.image`,
        });
      }

      // Validate resources
      if (!service.resources) {
        errors.push({
          code: 'MISSING_RESOURCES',
          message: `Service "${name}" must specify resources`,
          path: `services.${name}.resources`,
        });
      } else {
        // CPU validation
        if (!service.resources.cpu?.units || service.resources.cpu.units <= 0) {
          errors.push({
            code: 'INVALID_CPU',
            message: `Service "${name}" must have positive CPU units`,
            path: `services.${name}.resources.cpu`,
          });
        }

        // Memory validation
        if (!service.resources.memory?.size) {
          errors.push({
            code: 'INVALID_MEMORY',
            message: `Service "${name}" must specify memory size`,
            path: `services.${name}.resources.memory`,
          });
        }

        // Storage validation
        if (!service.resources.storage || service.resources.storage.length === 0) {
          errors.push({
            code: 'INVALID_STORAGE',
            message: `Service "${name}" must specify at least one storage volume`,
            path: `services.${name}.resources.storage`,
          });
        }

        // GPU validation
        if (service.resources.gpu) {
          if (service.resources.gpu.units <= 0) {
            errors.push({
              code: 'INVALID_GPU_UNITS',
              message: `Service "${name}" GPU units must be positive`,
              path: `services.${name}.resources.gpu.units`,
            });
          }

          const supportedGPUs = ['a100', 'h100', 'rtx4090', 'a10', 'rtx3090'];
          const models = service.resources.gpu.attributes?.vendor?.nvidia || [];
          for (const model of models) {
            if (!supportedGPUs.includes(model.model.toLowerCase())) {
              warnings.push({
                code: 'UNKNOWN_GPU_MODEL',
                message: `GPU model "${model.model}" may not be widely available`,
                suggestion: `Consider using one of: ${supportedGPUs.join(', ')}`,
              });
            }
          }
        }
      }

      // Check for exposed ports
      if (!service.expose || service.expose.length === 0) {
        warnings.push({
          code: 'NO_EXPOSED_PORTS',
          message: `Service "${name}" has no exposed ports`,
          suggestion: 'Consider exposing a port if this service needs to be accessible',
        });
      }
    }

    // Validate profiles match services
    for (const [name] of Object.entries(sdl.services)) {
      if (!sdl.deployment[name]) {
        errors.push({
          code: 'MISSING_DEPLOYMENT',
          message: `Service "${name}" is not defined in deployment section`,
          path: `deployment.${name}`,
        });
      }
    }

    // Validate placement
    if (!sdl.placement?.akash?.pricing) {
      errors.push({
        code: 'MISSING_PRICING',
        message: 'SDL must specify placement pricing',
        path: 'placement.akash.pricing',
      });
    }

    // Resource warnings
    const totalCPU = Object.values(sdl.services).reduce(
      (sum, s) => sum + (s.resources?.cpu?.units || 0),
      0
    );
    if (totalCPU > 16) {
      warnings.push({
        code: 'HIGH_CPU_USAGE',
        message: `Total CPU usage (${totalCPU} units) is high`,
        suggestion: 'This may limit available providers and increase costs',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateEnvironment(env: string[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /api.?key/i,
      /token/i,
      /credential/i,
    ];

    for (const envVar of env) {
      const [key, value] = envVar.split('=');
      if (!key || !value) continue;

      // Check for sensitive values that might not be encrypted
      for (const pattern of sensitivePatterns) {
        if (pattern.test(key) && !value.startsWith('enc:')) {
          warnings.push({
            code: 'UNENCRYPTED_SECRET',
            message: `Environment variable "${key}" appears to be sensitive but is not encrypted`,
            suggestion: 'Use Sealed Secrets to encrypt sensitive values',
          });
          break;
        }
      }

      // Check for empty values
      if (value.trim() === '') {
        warnings.push({
          code: 'EMPTY_ENV_VALUE',
          message: `Environment variable "${key}" has an empty value`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
