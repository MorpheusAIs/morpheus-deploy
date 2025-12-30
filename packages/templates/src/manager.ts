import { AIAgentTemplate } from './ai-agent/template.js';
import { MCPServerTemplate } from './mcp-server/template.js';
import { WebsiteTemplate } from './website/template.js';
import { CustomTemplate } from './custom/template.js';
import type { Template, TemplateType, SDLOutput, TemplateConfig } from './types.js';

// Re-export TemplateConfig for convenience
export type { TemplateConfig };

export class TemplateManager {
  private templates: Map<TemplateType, Template>;

  constructor() {
    this.templates = new Map<TemplateType, Template>();
    this.templates.set('ai-agent', new AIAgentTemplate());
    this.templates.set('mcp-server', new MCPServerTemplate());
    this.templates.set('website', new WebsiteTemplate());
    this.templates.set('custom', new CustomTemplate());
  }

  /**
   * Get a template by type
   */
  getTemplate(type: TemplateType): Template {
    const template = this.templates.get(type);
    if (!template) {
      throw new Error(`Unknown template type: ${type}`);
    }
    return template;
  }

  /**
   * Generate SDL from template configuration
   */
  generateSDL(config: TemplateConfig): SDLOutput {
    const template = this.getTemplate(config.type);
    return template.generate(config);
  }

  /**
   * List all available templates
   */
  listTemplates(): Array<{
    type: TemplateType;
    name: string;
    description: string;
  }> {
    return [
      {
        type: 'ai-agent',
        name: 'AI Agent',
        description: 'Long-running autonomous AI workflow with durable execution and GPU support',
      },
      {
        type: 'mcp-server',
        name: 'MCP Server',
        description: 'Model Context Protocol server for secure data pipelines',
      },
      {
        type: 'website',
        name: 'Website',
        description: 'Decentralized frontend or web application',
      },
      {
        type: 'custom',
        name: 'Custom',
        description: 'Advanced configuration with raw SDL support',
      },
    ];
  }

  /**
   * Validate template configuration
   */
  validateConfig(config: TemplateConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.projectName) {
      errors.push('Project name is required');
    }

    if (!config.image) {
      errors.push('Container image is required');
    }

    const template = this.templates.get(config.type);
    if (!template) {
      errors.push(`Unknown template type: ${config.type}`);
    }

    // Template-specific validation
    if (config.type === 'ai-agent' && config.resources?.gpu) {
      const validGPUs = ['nvidia-a100', 'nvidia-h100', 'nvidia-rtx4090', 'nvidia-a10'];
      if (!validGPUs.includes(config.resources.gpu.model)) {
        errors.push(`Invalid GPU model. Must be one of: ${validGPUs.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get default configuration for a template type
   */
  getDefaultConfig(type: TemplateType): Partial<TemplateConfig> {
    const template = this.getTemplate(type);
    return template.getDefaults();
  }
}
