# SDL Synthesis Guide

This guide explains how Morpheus synthesizes Akash SDL (Stack Definition Language) manifests from your configuration.

## Overview

SDL is Akash's deployment specification format, similar to Docker Compose or Kubernetes manifests. Morpheus automatically generates optimized SDL from your `morpheus.yaml` configuration.

## SDL Structure

An Akash SDL consists of four main sections:

```yaml
version: "2.0"

services:
  # Container definitions

profiles:
  compute:
    # Resource requirements
  placement:
    # Provider selection rules

deployment:
  # Service-to-profile mapping
```

## Synthesis Process

### Input: morpheus.yaml

```yaml
project:
  name: my-agent

template: ai-agent

resources:
  cpu: 2
  memory: 4Gi
  storage: 10Gi
  gpu:
    enabled: true
    model: rtx4090
    count: 1

env:
  NODE_ENV: production
  ANTHROPIC_API_KEY: sealed:v1:...
```

### Output: Generated SDL

```yaml
version: "2.0"

services:
  agent:
    image: ghcr.io/user/my-agent:latest
    expose:
      - port: 8000
        as: 80
        to:
          - global: true
    env:
      - NODE_ENV=production
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - DATABASE_URL=postgres://postgres:password@localhost:5432/workflow
    depends_on:
      - postgres

  postgres:
    image: morpheus/postgres-sidecar:15
    expose:
      - port: 5432
        to:
          - service: agent
    env:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=workflow

  log-shipper:
    image: morpheus/vector-sidecar:0.26.0
    expose:
      - port: 8686
        to:
          - global: true
    env:
      - VECTOR_CONFIG=/etc/vector/vector.toml

profiles:
  compute:
    agent:
      resources:
        cpu:
          units: 2
        memory:
          size: 4Gi
        storage:
          size: 10Gi
        gpu:
          units: 1
          attributes:
            vendor:
              nvidia:
                - model: rtx4090
    postgres:
      resources:
        cpu:
          units: 0.5
        memory:
          size: 1Gi
        storage:
          size: 5Gi
    log-shipper:
      resources:
        cpu:
          units: 0.1
        memory:
          size: 128Mi
        storage:
          size: 100Mi

  placement:
    akash:
      attributes:
        region: us-west
      signedBy:
        anyOf:
          - akash1365yvmc4s7awdyj3n2sav7xfx76adc6dnmlx63
      pricing:
        agent:
          denom: uakt
          amount: 10000
        postgres:
          denom: uakt
          amount: 1000
        log-shipper:
          denom: uakt
          amount: 500

deployment:
  agent:
    akash:
      profile: agent
      count: 1
  postgres:
    akash:
      profile: postgres
      count: 1
  log-shipper:
    akash:
      profile: log-shipper
      count: 1
```

## Service Definitions

### Main Application Service

The main service is derived from your project configuration:

```yaml
services:
  agent:
    image: ${REGISTRY}/${PROJECT_NAME}:${TAG}
    expose:
      - port: ${APP_PORT}
        as: 80
        to:
          - global: true
    env:
      # From morpheus.yaml env section
      # Sealed secrets are injected at runtime
```

### PostgreSQL Sidecar

Automatically injected for templates with `postgres: true`:

```yaml
postgres:
  image: morpheus/postgres-sidecar:15
  expose:
    - port: 5432
      to:
        - service: agent  # Only accessible by main service
  env:
    - POSTGRES_PASSWORD=${DB_PASSWORD}
    - POSTGRES_DB=workflow
    - POSTGRES_USER=postgres
  params:
    storage:
      data:
        mount: /var/lib/postgresql/data
        readOnly: false
```

### Vector Log Shipper

Automatically injected for log streaming:

```yaml
log-shipper:
  image: morpheus/vector-sidecar:0.26.0
  expose:
    - port: 8686
      to:
        - global: true  # For WebSocket log streaming
  env:
    - VECTOR_CONFIG=/etc/vector/vector.toml
    - MORPHEUS_LOG_ENDPOINT=${LOG_RELAY_URL}
```

## Resource Profiles

### CPU Resources

```yaml
resources:
  cpu:
    units: 2  # Number of CPU cores (can be fractional: 0.5)
```

| Value | Description |
|-------|-------------|
| 0.1 | Minimal (monitoring, sidecars) |
| 0.5 | Light workloads |
| 1 | Standard workload |
| 2-4 | Compute-intensive |
| 8+ | Heavy processing |

### Memory Resources

```yaml
resources:
  memory:
    size: 4Gi  # Memory allocation
```

| Value | Description |
|-------|-------------|
| 128Mi | Minimal sidecars |
| 512Mi | Light applications |
| 1-2Gi | Standard applications |
| 4-8Gi | Memory-intensive |
| 16Gi+ | Large models/datasets |

### Storage Resources

```yaml
resources:
  storage:
    size: 10Gi  # Ephemeral storage
```

For persistent storage:

```yaml
resources:
  storage:
    - name: data
      size: 10Gi
      attributes:
        persistent: true
        class: beta3
```

### GPU Resources

```yaml
resources:
  gpu:
    units: 1
    attributes:
      vendor:
        nvidia:
          - model: rtx4090  # Specific model
```

Available GPU models on Akash:

| Model | VRAM | Use Case |
|-------|------|----------|
| rtx3060 | 12GB | Development, small models |
| rtx3080 | 10GB | Medium inference |
| rtx3090 | 24GB | Large models |
| rtx4090 | 24GB | Production inference |
| a100 | 40/80GB | Training, large inference |
| h100 | 80GB | Enterprise AI |

## Placement Configuration

### Region Selection

```yaml
profiles:
  placement:
    akash:
      attributes:
        region: us-west  # Preferred region
```

Available regions:
- `us-west`
- `us-east`
- `eu-west`
- `eu-central`
- `asia-southeast`

### Provider Selection

```yaml
profiles:
  placement:
    akash:
      signedBy:
        anyOf:
          - akash1...  # Trusted auditor addresses
```

### Pricing

```yaml
profiles:
  placement:
    akash:
      pricing:
        agent:
          denom: uakt
          amount: 10000  # Max bid in uAKT per block
```

Pricing calculation:
- 1 AKT = 1,000,000 uAKT
- Average block time: ~6 seconds
- Monthly cost ≈ (uAKT/block) × 14,400 × 30

## Template-Specific SDL

### AI Agent Template

```yaml
# Generated for template: ai-agent
services:
  agent:
    image: ${IMAGE}
    expose:
      - port: 8000
        as: 80
        to: [{ global: true }]
    env:
      - DATABASE_URL=postgres://postgres:password@localhost:5432/workflow

  postgres:
    image: morpheus/postgres-sidecar:15
    expose:
      - port: 5432
        to: [{ service: agent }]

  log-shipper:
    image: morpheus/vector-sidecar:0.26.0
    expose:
      - port: 8686
        to: [{ global: true }]

profiles:
  compute:
    agent:
      resources:
        cpu: { units: 2 }
        memory: { size: 4Gi }
        storage: { size: 10Gi }
        gpu:
          units: 1
          attributes:
            vendor:
              nvidia:
                - model: rtx4090
```

### MCP Server Template

```yaml
# Generated for template: mcp-server
services:
  mcp:
    image: ${IMAGE}
    expose:
      - port: 8080
        as: 80
        to: [{ global: true }]

profiles:
  compute:
    mcp:
      resources:
        cpu: { units: 0.5 }
        memory: { size: 512Mi }
        storage: { size: 1Gi }
```

### Website Template

```yaml
# Generated for template: website
services:
  web:
    image: ${IMAGE}
    expose:
      - port: 3000
        as: 80
        to: [{ global: true }]

profiles:
  compute:
    web:
      resources:
        cpu: { units: 0.5 }
        memory: { size: 256Mi }
        storage: { size: 500Mi }
```

### Custom Template

Full control over SDL generation:

```yaml
# morpheus.yaml
template: custom

custom:
  services:
    api:
      image: my-api:latest
      port: 8000
      resources:
        cpu: 1
        memory: 2Gi
    worker:
      image: my-worker:latest
      resources:
        cpu: 2
        memory: 4Gi
    redis:
      image: redis:7-alpine
      port: 6379
      resources:
        cpu: 0.5
        memory: 512Mi
```

## Sealed Secrets

Environment variables prefixed with `sealed:` are encrypted using ECIES:

```yaml
# morpheus.yaml
env:
  ANTHROPIC_API_KEY: sealed:v1:BGVh...base64...==
```

### Sealing Secrets

```bash
# Seal a secret
morpheus secrets seal ANTHROPIC_API_KEY=sk-ant-...

# Output: sealed:v1:BGVh...

# Seal from file
morpheus secrets seal --file .env.production
```

### Secret Decryption Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Sealed Secret  │────▶│  Deploy to      │────▶│   Container     │
│  in SDL         │     │  Akash          │     │   Runtime       │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │  Decrypt with   │
                                                │  Wallet Key     │
                                                │  at Startup     │
                                                └─────────────────┘
```

## SDL Validation

### Validation Rules

1. **Resource Limits** - CPU/Memory/Storage within provider limits
2. **Port Conflicts** - No duplicate exposed ports
3. **Service Dependencies** - Valid `depends_on` references
4. **Image References** - Valid container image URLs
5. **Environment Variables** - Valid format

### Running Validation

```bash
# Validate current config
morpheus validate

# Validate specific file
morpheus validate --config custom-morpheus.yaml

# Output validation details
morpheus validate --verbose
```

### Validation Output

```
Validating morpheus.yaml...

✓ Project configuration valid
✓ Template 'ai-agent' recognized
✓ Resources within limits
✓ Environment variables valid
✓ Sealed secrets properly formatted

Generated SDL validation:
✓ Services: agent, postgres, log-shipper
✓ Profiles: compute, placement
✓ Deployment mapping valid
✓ Total resources: 2.6 CPU, 5.1Gi RAM, 15.1Gi storage

Estimated cost: ~0.05 AKT/block (~45 AKT/month)

SDL is valid and ready for deployment.
```

## Advanced SDL Features

### Health Checks

```yaml
services:
  agent:
    image: my-app:latest
    expose:
      - port: 8000
        as: 80
        to: [{ global: true }]
    # Health check configuration
    args:
      - --health-cmd=wget -q -O- http://localhost:8000/health
      - --health-interval=30s
      - --health-timeout=5s
      - --health-retries=3
```

### Init Containers

```yaml
services:
  agent:
    image: my-app:latest
    depends_on:
      - init-db

  init-db:
    image: my-app:latest
    command: ["node", "scripts/migrate.js"]
    # Runs once before main container starts
```

### Shared Volumes

```yaml
services:
  agent:
    image: my-app:latest
    params:
      storage:
        shared:
          mount: /data
          readOnly: false

  worker:
    image: my-worker:latest
    params:
      storage:
        shared:
          mount: /data
          readOnly: true
```

## Debugging SDL

### View Generated SDL

```bash
# Output SDL without deploying
morpheus deploy --dry-run --output-sdl

# Save to file
morpheus deploy --dry-run --output-sdl > deployment.yaml
```

### Common Issues

#### "Resource exceeds provider capacity"

```bash
# Check available resources
morpheus providers list --resources

# Reduce requirements or select different provider
```

#### "Invalid image reference"

```bash
# Ensure image is publicly accessible or credentials provided
docker pull ghcr.io/user/my-app:latest

# Or push to registry first
morpheus deploy --skip-build  # Uses existing image
```

#### "Port already in use"

```yaml
# Ensure unique ports for each service
services:
  api:
    expose:
      - port: 8000  # ✓
  admin:
    expose:
      - port: 8001  # ✓ Different port
```

## API Reference

### SDLSynthesizer

```typescript
class SDLSynthesizer {
  // Generate SDL from configuration
  async synthesize(options: SDLConfig): Promise<SDLOutput>;

  // Add sidecar services
  private addPostgresSidecar(services: ServiceMap): void;
  private addVectorSidecar(services: ServiceMap): void;

  // Calculate pricing
  private calculatePricing(resources: Resources): number;

  // Generate YAML output
  private toYAML(sdl: SDLOutput): string;
}
```

### SDLValidator

```typescript
class SDLValidator {
  // Validate SDL against schema
  validate(sdl: SDLOutput): ValidationResult;

  // Check resource limits
  validateResources(resources: Resources): ValidationResult;

  // Validate service references
  validateDependencies(services: ServiceMap): ValidationResult;
}
```
