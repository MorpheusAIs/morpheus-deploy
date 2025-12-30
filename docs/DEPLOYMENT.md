# Production Deployment Guide

This guide covers deploying applications to production on Akash Network using Morpheus.

## Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] Application tested locally
- [ ] Docker image builds successfully
- [ ] Environment variables configured
- [ ] Secrets properly sealed
- [ ] Smart wallet funded with USDC
- [ ] Health check endpoint implemented

## Deployment Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Production Deployment Flow                        │
│                                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │ Config  │─▶│  Build  │─▶│  Push   │─▶│  SDL    │─▶│  Fund   │      │
│  │ Validate│  │  Image  │  │ Registry│  │ Synth   │  │  Escrow │      │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘      │
│                                                             │            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────┴───┐      │
│  │ Verify  │◀─│ Manifest│◀─│  Lease  │◀─│  Bids   │◀─│ Deploy  │      │
│  │ Health  │  │  Send   │  │ Create  │  │  Match  │  │  Create │      │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Deployment

### 1. Prepare Configuration

Create or update `morpheus.yaml`:

```yaml
project:
  name: my-production-app
  version: 1.0.0

template: ai-agent
network: mainnet  # Use 'testnet' for Base Sepolia + Akash Sandbox

provider:
  region: us-west

funding:
  source: smart-wallet
  currency: USDC
  initialDeposit: 50.00  # Higher for production
  autoTopUp:
    enabled: true
    threshold: 0.10
    amount: 25.00

resources:
  cpu: 4           # More resources for production
  memory: 8Gi
  storage: 20Gi
  gpu:
    enabled: true
    model: rtx4090
    count: 1

runtime:
  replicas: 1
  healthCheck:
    path: /health
    interval: 30s
    timeout: 5s
    retries: 3

env:
  NODE_ENV: production
  LOG_LEVEL: info
  ANTHROPIC_API_KEY: sealed:v1:...
  DATABASE_URL: sealed:v1:...
```

### 2. Seal Production Secrets

```bash
# Seal each secret
morpheus secrets seal ANTHROPIC_API_KEY=sk-ant-api03-...
morpheus secrets seal DATABASE_URL=postgres://...

# Or seal from file
morpheus secrets seal --file .env.production

# Verify sealed secrets
morpheus secrets verify
```

### 3. Build and Test Locally

```bash
# Build Docker image
docker build -t my-app:latest .

# Test locally
docker run -p 8000:8000 my-app:latest

# Verify health endpoint
curl http://localhost:8000/health
```

### 4. Validate Configuration

```bash
# Validate before deploying
morpheus validate

# Preview deployment
morpheus deploy --dry-run
```

### 5. Deploy

```bash
# Full deployment
morpheus deploy

# With verbose output
morpheus deploy --verbose
```

### 6. Verify Deployment

```bash
# Check status
morpheus status

# Stream logs
morpheus logs --follow

# Test endpoint
curl https://your-deployment-url.akash.network/health
```

## Production Configuration

### Resource Sizing

| Workload | CPU | Memory | Storage | GPU |
|----------|-----|--------|---------|-----|
| Light API | 0.5 | 512Mi | 1Gi | - |
| Standard API | 1-2 | 1-2Gi | 5Gi | - |
| AI Inference | 2-4 | 4-8Gi | 10Gi | 1x RTX4090 |
| Heavy AI | 4-8 | 16-32Gi | 50Gi | 2x A100 |

### Escrow Management

Production escrow recommendations:

```yaml
funding:
  initialDeposit: 50.00   # ~1 month runway
  autoTopUp:
    enabled: true         # Always enable for production
    threshold: 0.10       # Top-up at 10% remaining
    amount: 25.00         # Refill amount
```

Estimated costs:

| Resources | ~Monthly Cost |
|-----------|---------------|
| 1 CPU, 1Gi | ~10-15 AKT |
| 2 CPU, 4Gi | ~20-30 AKT |
| 4 CPU, 8Gi + GPU | ~50-100 AKT |

### Health Checks

Implement robust health checks:

```typescript
// health.ts
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    memory: process.memoryUsage().heapUsed < MAX_HEAP,
    uptime: process.uptime() > 0,
  };

  const healthy = Object.values(checks).every(Boolean);

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  });
});
```

### Logging Best Practices

```typescript
// Use structured logging
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
});

// Include context in logs
logger.info({
  event: 'request_received',
  method: req.method,
  path: req.path,
  requestId: req.id,
});
```

## Monitoring and Observability

### Real-Time Logs

```bash
# Stream all logs
morpheus logs

# Filter by level
morpheus logs --level error

# Filter by service
morpheus logs --service agent
```

### Status Monitoring

```bash
# Watch status
morpheus status --watch

# JSON output for scripting
morpheus status --json | jq '.escrowBalance'
```

### Alerts Setup

Set up escrow alerts using the watchdog:

```bash
# Run watchdog locally
export MORPHEUS_OWNER=akash1...
export MORPHEUS_DSEQ=12345678
export ESCROW_THRESHOLD=0.10
./scripts/watchdog.sh

# Or as a cron job
*/5 * * * * /path/to/watchdog.sh >> /var/log/morpheus-watchdog.log 2>&1
```

## Updating Deployments

### Rolling Updates

```bash
# Update code and redeploy
git pull
morpheus deploy

# Skip build if image unchanged
morpheus deploy --skip-build
```

### Configuration Updates

```bash
# Update environment variables
# Edit morpheus.yaml, then:
morpheus deploy

# Update resources (requires new deployment)
morpheus deploy --force
```

### Rollback

```bash
# List deployment history
morpheus deployments list

# Rollback to specific version
morpheus deploy --image my-app:v1.2.3
```

## Scaling

### Horizontal Scaling

Currently, Morpheus deploys single instances. For horizontal scaling:

```yaml
# Deploy multiple independent instances
runtime:
  replicas: 1  # Each deployment is one instance

# Use load balancer (external)
# Configure DNS to point to multiple deployment URLs
```

### Vertical Scaling

```yaml
# Increase resources
resources:
  cpu: 8      # More CPU
  memory: 16Gi # More memory
  gpu:
    count: 2   # More GPUs
```

## Security Hardening

### Secret Management

```bash
# Rotate secrets
morpheus secrets seal NEW_API_KEY=sk-new-...
morpheus deploy

# Audit sealed secrets
morpheus secrets list
```

### Network Security

- Deployments are isolated by default
- Only exposed ports are accessible
- Use HTTPS (TLS handled by Akash providers)

### Wallet Security

```bash
# Use separate wallets for prod/staging
export MORPHEUS_WALLET_PATH=~/.morpheus/wallets/production.json

# Regularly rotate ephemeral keys
morpheus wallet keys rotate

# Review active grants
morpheus wallet grants list
```

## Troubleshooting

### Deployment Failures

```bash
# Check detailed logs
morpheus deploy --verbose

# Common issues:
# 1. Insufficient funds
morpheus wallet balance
morpheus fund --amount 20

# 2. Image not accessible
docker pull ghcr.io/user/my-app:latest

# 3. Resource constraints
morpheus providers list --resources
```

### Runtime Issues

```bash
# Container not starting
morpheus logs --service agent --tail 100

# Database connection issues
morpheus logs --service postgres

# Out of memory
# Increase memory in morpheus.yaml
```

### Escrow Depletion

```bash
# Check current balance
morpheus status

# Emergency top-up
morpheus fund --amount 10 --auto

# Enable auto top-up
# Edit morpheus.yaml:
# autoTopUp:
#   enabled: true
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Akash

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Morpheus CLI
        run: npm install -g morpheus-cli

      - name: Configure Wallet
        run: |
          mkdir -p ~/.morpheus
          echo '${{ secrets.MORPHEUS_WALLET }}' > ~/.morpheus/wallet.json

      - name: Deploy
        run: morpheus deploy --auto
        env:
          AKASH_NODE: https://rpc.akashnet.net:443
```

### GitLab CI

```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  image: node:20
  script:
    - npm install -g morpheus-cli
    - mkdir -p ~/.morpheus
    - echo "$MORPHEUS_WALLET" > ~/.morpheus/wallet.json
    - morpheus deploy --auto
  only:
    - main
```

## Disaster Recovery

### Backup Strategy

```bash
# Backup wallet
cp ~/.morpheus/wallet.json ~/backups/wallet-$(date +%Y%m%d).json

# Backup configuration
cp morpheus.yaml ~/backups/morpheus-$(date +%Y%m%d).yaml

# Export deployment info
morpheus status --json > ~/backups/deployment-$(date +%Y%m%d).json
```

### Recovery Procedure

1. **Wallet Recovery**
   ```bash
   # Restore wallet backup
   cp ~/backups/wallet-backup.json ~/.morpheus/wallet.json

   # Or recover via passkey
   morpheus wallet recover --method passkey
   ```

2. **Redeploy**
   ```bash
   # Deploy fresh instance
   morpheus deploy
   ```

3. **Data Recovery**
   - PostgreSQL data is ephemeral unless using persistent volumes
   - Consider external backup solutions for critical data

## Cost Optimization

### Resource Right-Sizing

```bash
# Monitor actual usage
morpheus status --json | jq '.resources'

# Reduce if over-provisioned
# Update morpheus.yaml with lower values
```

### Provider Selection

```bash
# Compare provider prices
morpheus providers list --sort price

# Select specific provider
morpheus deploy --provider akash1cheap...
```

### Scheduled Scaling

For non-24/7 workloads:

```bash
# Scale down during off-hours
morpheus close  # Stop deployment

# Scale up when needed
morpheus deploy  # Restart
```
