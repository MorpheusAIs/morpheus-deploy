# Templates Guide

This guide covers the available deployment templates in Morpheus.

## Overview

Templates provide pre-configured deployment patterns for common use cases. Each template includes:

- Default resource allocations
- Sidecar configurations
- Environment variable presets
- Health check settings

## Available Templates

| Template | Use Case | Sidecars | GPU |
|----------|----------|----------|-----|
| `ai-agent` | AI agents and LLM applications | PostgreSQL, Vector | Yes |
| `mcp-server` | Model Context Protocol servers | None | No |
| `website` | Static and dynamic websites | None | No |
| `custom` | Full manual configuration | Configurable | Configurable |

## AI Agent Template

The `ai-agent` template is optimized for deploying AI agents that require:

- GPU acceleration for inference
- Persistent state via PostgreSQL
- Real-time log streaming

### Default Configuration

```yaml
template: ai-agent

# Default resources
resources:
  cpu: 2
  memory: 4Gi
  storage: 10Gi
  gpu:
    enabled: true
    model: rtx4090
    count: 1

# Included sidecars
sidecars:
  postgres: true
  vector: true
```

### Generated Services

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Agent Pod                             │
│                                                             │
│  ┌─────────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │     Agent       │  │   PostgreSQL  │  │    Vector    │ │
│  │   Container     │  │    Sidecar    │  │   Sidecar    │ │
│  │                 │  │               │  │              │ │
│  │  Port: 8000     │  │  Port: 5432   │  │  Port: 8686  │ │
│  │  GPU: RTX4090   │  │  Storage: 5Gi │  │              │ │
│  │                 │  │               │  │              │ │
│  └────────┬────────┘  └───────┬───────┘  └──────┬───────┘ │
│           │                   │                  │         │
│           │         Internal Network             │         │
│           └───────────────────┴──────────────────┘         │
│                                                             │
│  Exposed: Port 80 (agent), Port 8686 (logs)               │
└─────────────────────────────────────────────────────────────┘
```

### Environment Variables

Automatically injected:

```bash
# Database connection
DATABASE_URL=postgres://postgres:password@localhost:5432/workflow

# Port configuration
PORT=8000

# Node environment
NODE_ENV=production
```

### Use Cases

- **Claude agents** with tool use
- **LangChain/LlamaIndex** applications
- **Autonomous agents** requiring persistence
- **Multi-modal AI** applications

### Example

```yaml
# morpheus.yaml
project:
  name: my-ai-agent

template: ai-agent

resources:
  gpu:
    model: rtx4090
    count: 1

env:
  ANTHROPIC_API_KEY: sealed:v1:...
  MODEL_NAME: claude-3-opus
```

---

## MCP Server Template

The `mcp-server` template is for lightweight Model Context Protocol servers.

### Default Configuration

```yaml
template: mcp-server

# Minimal resources
resources:
  cpu: 0.5
  memory: 512Mi
  storage: 1Gi
  gpu:
    enabled: false

# No sidecars needed
sidecars:
  postgres: false
  vector: false
```

### Generated Services

```
┌─────────────────────────────────────────┐
│           MCP Server Pod                │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │         MCP Server              │   │
│  │         Container               │   │
│  │                                 │   │
│  │  Port: 8080                     │   │
│  │  Protocol: JSON-RPC over HTTP   │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Exposed: Port 80                       │
└─────────────────────────────────────────┘
```

### MCP Protocol Support

The template includes configuration for:

- JSON-RPC 2.0 transport
- SSE (Server-Sent Events) support
- Standard MCP tool interface

### Use Cases

- **Tool servers** for Claude Desktop
- **API bridges** to external services
- **Custom MCP implementations**
- **Resource providers**

### Example

```yaml
# morpheus.yaml
project:
  name: github-mcp-server

template: mcp-server

resources:
  cpu: 0.5
  memory: 512Mi

env:
  GITHUB_TOKEN: sealed:v1:...
  RATE_LIMIT: "100"
```

---

## Website Template

The `website` template is for static sites and web applications.

### Default Configuration

```yaml
template: website

# Minimal resources
resources:
  cpu: 0.5
  memory: 256Mi
  storage: 500Mi
  gpu:
    enabled: false

sidecars:
  postgres: false
  vector: false
```

### Generated Services

```
┌─────────────────────────────────────────┐
│           Website Pod                   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │          Web Server             │   │
│  │          Container              │   │
│  │                                 │   │
│  │  Port: 3000                     │   │
│  │  Serves: Static + SSR           │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Exposed: Port 80                       │
└─────────────────────────────────────────┘
```

### Framework Support

Automatically detected frameworks:

| Framework | Build Command | Output |
|-----------|--------------|--------|
| Next.js | `next build` | Standalone server |
| Remix | `remix build` | Server bundle |
| Astro | `astro build` | Static/SSR |
| Vite | `vite build` | Static files |
| Create React App | `react-scripts build` | Static files |

### Use Cases

- **Landing pages**
- **Documentation sites**
- **Next.js applications**
- **Static portfolios**

### Example

```yaml
# morpheus.yaml
project:
  name: my-website

template: website

resources:
  cpu: 0.5
  memory: 256Mi

runtime:
  healthCheck:
    path: /
    interval: 60s

env:
  NEXT_PUBLIC_API_URL: https://api.example.com
```

---

## Custom Template

The `custom` template provides full control over deployment configuration.

### Configuration

```yaml
template: custom

custom:
  services:
    # Define your own services
    api:
      image: my-api:latest
      port: 8000
      resources:
        cpu: 1
        memory: 2Gi
      env:
        - NODE_ENV=production

    worker:
      image: my-worker:latest
      resources:
        cpu: 2
        memory: 4Gi
        gpu:
          enabled: true
          model: rtx3090

    redis:
      image: redis:7-alpine
      port: 6379
      resources:
        cpu: 0.5
        memory: 512Mi

  # Custom sidecar configuration
  sidecars:
    postgres:
      enabled: true
      version: "15"
      storage: 10Gi

    vector:
      enabled: true
      config: |
        [sources.agent_logs]
        type = "file"
        include = ["/var/log/app/*.log"]

  # Custom placement rules
  placement:
    region: us-west
    minBidPrice: 5000
    maxBidPrice: 20000
```

### Generated Services

```
┌─────────────────────────────────────────────────────────────────┐
│                    Custom Pod                                   │
│                                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │    API    │  │  Worker   │  │   Redis   │  │ PostgreSQL│   │
│  │           │  │           │  │           │  │           │   │
│  │ Port:8000 │  │ GPU:3090  │  │ Port:6379 │  │ Port:5432 │   │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                       Vector                             │   │
│  │                    Log Shipper                           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Use Cases

- **Multi-container applications**
- **Custom infrastructure requirements**
- **Non-standard architectures**
- **Migration from Kubernetes**

---

## Template Comparison

| Feature | ai-agent | mcp-server | website | custom |
|---------|----------|------------|---------|--------|
| Default CPU | 2 | 0.5 | 0.5 | - |
| Default Memory | 4Gi | 512Mi | 256Mi | - |
| GPU Support | Yes | No | No | Yes |
| PostgreSQL | Yes | No | No | Optional |
| Vector Logs | Yes | No | No | Optional |
| Health Check | `/health` | `/health` | `/` | Custom |
| Auto-scaling | No | No | No | No |

## Creating Custom Templates

You can create reusable templates by extending the base template class:

```typescript
// my-template.ts
import { Template, TemplateConfig, SDLOutput } from '@morpheus/templates';

export const myTemplate: Template = {
  name: 'my-custom-template',
  description: 'Custom template for my use case',

  defaultResources: {
    cpu: 1,
    memory: '2Gi',
    storage: '5Gi',
    gpu: {
      enabled: false,
    },
  },

  sidecars: {
    postgres: true,
    vector: true,
    custom: [
      {
        name: 'redis',
        image: 'redis:7-alpine',
        port: 6379,
        resources: {
          cpu: 0.5,
          memory: '256Mi',
        },
      },
    ],
  },

  validate(config: TemplateConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Custom validation logic
    if (!config.env.REQUIRED_VAR) {
      errors.push('REQUIRED_VAR environment variable is required');
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  async generateSDL(config: TemplateConfig): Promise<SDLOutput> {
    // Custom SDL generation logic
    return {
      version: '2.0',
      services: {
        // ...
      },
      profiles: {
        // ...
      },
      deployment: {
        // ...
      },
    };
  },
};
```

### Registering Custom Templates

```typescript
// In your project
import { TemplateManager } from '@morpheus/templates';
import { myTemplate } from './my-template';

const manager = new TemplateManager();
manager.register(myTemplate);

// Now usable in morpheus.yaml
// template: my-custom-template
```

## Template Selection Guide

```
┌─────────────────────────────────────────────────────────────────┐
│                    Which Template?                              │
│                                                                 │
│  Need GPU for AI?                                               │
│      │                                                          │
│      ├── Yes ──▶ ai-agent                                      │
│      │                                                          │
│      └── No                                                     │
│           │                                                     │
│           ├── Building MCP server? ──▶ mcp-server              │
│           │                                                     │
│           ├── Static/dynamic website? ──▶ website              │
│           │                                                     │
│           └── Complex requirements? ──▶ custom                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
