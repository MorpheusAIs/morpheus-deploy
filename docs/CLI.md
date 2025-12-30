# CLI Reference

Complete documentation for the Morpheus CLI commands.

## Installation

```bash
# Via npm
npm install -g morpheus-cli

# Via pnpm
pnpm add -g morpheus-cli

# From source
git clone https://github.com/morpheus-deploy/morpheus-deploy.git
cd morpheus-deploy
pnpm install && pnpm build
cd apps/cli && pnpm link --global
```

## Global Options

These options are available for all commands:

| Option | Description |
|--------|-------------|
| `-V, --version` | Output version number |
| `-h, --help` | Display help |
| `--verbose` | Enable verbose output |
| `--config <path>` | Custom config file path |

## Commands

### `morpheus init`

Initialize a new Morpheus project with interactive prompts.

```bash
morpheus init [options]
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-n, --name <name>` | Project name | Directory name |
| `-t, --template <template>` | Deployment template | `ai-agent` |
| `--skip-wallet` | Skip wallet creation | `false` |
| `--dev` | Use development wallet | `false` |

#### Templates

| Template | Description |
|----------|-------------|
| `ai-agent` | GPU-enabled AI agent with PostgreSQL and Vector sidecars |
| `mcp-server` | Lightweight Model Context Protocol server |
| `website` | Static or dynamic website |
| `custom` | Full manual configuration |

#### Examples

```bash
# Interactive initialization
morpheus init

# Non-interactive with flags
morpheus init --name my-agent --template ai-agent

# Development mode (test wallet)
morpheus init --dev
```

#### Generated Files

```
my-project/
├── morpheus.yaml      # Main configuration
├── Dockerfile         # Container definition (if not exists)
└── .morpheus/
    └── wallet.json    # Encrypted wallet data
```

---

### `morpheus deploy`

Build and deploy your application to Akash Network.

```bash
morpheus deploy [options]
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-d, --dry-run` | Preview without deploying | `false` |
| `--skip-build` | Skip Docker build step | `false` |
| `--skip-push` | Skip registry push | `false` |
| `--provider <address>` | Specific provider address | Auto-select |
| `--deposit <amount>` | Initial deposit amount | From config |
| `--network <network>` | Network (`mainnet`/`testnet`) | `mainnet` |

#### Deployment Steps

1. **Parse Configuration** - Read `morpheus.yaml`
2. **Build Image** - Create Docker container
3. **Push to Registry** - Upload to container registry
4. **Synthesize SDL** - Generate Akash manifest
5. **Execute Swap** - Convert USDC → AKT via Skip Go
6. **Create Deployment** - Broadcast to Akash network
7. **Wait for Bids** - Collect provider bids
8. **Create Lease** - Select provider and create lease
9. **Send Manifest** - Upload deployment manifest
10. **Verify** - Confirm deployment is running

#### Examples

```bash
# Standard deployment
morpheus deploy

# Preview deployment (no actual deploy)
morpheus deploy --dry-run

# Deploy with specific provider
morpheus deploy --provider akash1abc...xyz

# Deploy to testnet
morpheus deploy --network testnet

# Skip build (use existing image)
morpheus deploy --skip-build
```

#### Output

```
Morpheus Deploy v1.0.0
======================

[1/10] Parsing configuration...
       Project: my-agent
       Template: ai-agent

[2/10] Building Docker image...
       Image: my-agent:latest
       Size: 245MB

[3/10] Pushing to registry...
       Registry: ghcr.io/user/my-agent:latest

[4/10] Synthesizing SDL...
       Services: agent, postgres, log-shipper
       Resources: 2 CPU, 4Gi RAM, 1x RTX4090

[5/10] Executing swap...
       Amount: 10.00 USDC
       Split: 6.00 USDC → MOR, 4.00 USDC → AKT
       Rate: 1 USDC = 2.45 AKT
       Received: 9.80 AKT

[6/10] Creating deployment...
       DSEQ: 12345678
       TX: ABC123...

[7/10] Waiting for bids...
       Received 5 bids

[8/10] Creating lease...
       Provider: akash1provider...
       Price: 0.50 AKT/block

[9/10] Sending manifest...
       Manifest uploaded successfully

[10/10] Verifying deployment...

Deployment successful!
  DSEQ: 12345678
  URL: https://abc123.akash.network
  Status: Running

Run 'morpheus logs' to view application logs
```

---

### `morpheus logs`

Stream real-time logs from your deployment.

```bash
morpheus logs [options]
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-d, --dseq <dseq>` | Deployment sequence number | Latest |
| `-f, --follow` | Follow log output | `true` |
| `--tail <lines>` | Number of lines from end | `100` |
| `--service <name>` | Filter by service | All services |
| `--since <time>` | Show logs since timestamp | Beginning |

#### Log Format

```
[TIMESTAMP] [SERVICE] [LEVEL] MESSAGE
```

#### Examples

```bash
# Stream all logs
morpheus logs

# Stream specific deployment
morpheus logs --dseq 12345678

# View last 50 lines
morpheus logs --tail 50

# Filter by service
morpheus logs --service agent

# Logs since specific time
morpheus logs --since "2024-01-15T10:00:00Z"

# Don't follow (exit after printing)
morpheus logs --no-follow
```

#### Output

```
Connecting to deployment 12345678...

[2024-01-15T10:30:01Z] [agent] [INFO] Server starting on port 8000
[2024-01-15T10:30:02Z] [agent] [INFO] Connected to PostgreSQL
[2024-01-15T10:30:03Z] [agent] [INFO] Loading AI model...
[2024-01-15T10:30:15Z] [agent] [INFO] Model loaded successfully
[2024-01-15T10:30:15Z] [agent] [INFO] Ready to accept requests
[2024-01-15T10:31:00Z] [postgres] [INFO] Checkpoint complete
```

---

### `morpheus status`

Check deployment status and escrow balance.

```bash
morpheus status [options]
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-d, --dseq <dseq>` | Deployment sequence number | Latest |
| `--json` | Output as JSON | `false` |
| `--watch` | Continuously update | `false` |

#### Status Fields

| Field | Description |
|-------|-------------|
| `state` | `active`, `closed`, `pending` |
| `provider` | Provider address |
| `created` | Creation timestamp |
| `escrowBalance` | Remaining AKT in escrow |
| `burnRate` | AKT consumed per block |
| `estimatedRuntime` | Time until escrow depleted |

#### Examples

```bash
# Check latest deployment
morpheus status

# Check specific deployment
morpheus status --dseq 12345678

# JSON output for scripting
morpheus status --json

# Watch mode (updates every 30s)
morpheus status --watch
```

#### Output

```
Deployment Status
=================

DSEQ:           12345678
State:          Active
Provider:       akash1provider...abc
Created:        2024-01-15T10:30:00Z
Runtime:        2d 5h 30m

Escrow
------
Balance:        4.25 AKT
Burn Rate:      0.0012 AKT/block
Est. Runtime:   ~14 days

Resources
---------
CPU:            2 cores (85% used)
Memory:         4Gi (3.2Gi used)
Storage:        10Gi (2.5Gi used)
GPU:            1x RTX4090 (active)

Services
--------
┌─────────────┬─────────┬────────┐
│ Service     │ Status  │ Uptime │
├─────────────┼─────────┼────────┤
│ agent       │ Running │ 2d 5h  │
│ postgres    │ Running │ 2d 5h  │
│ log-shipper │ Running │ 2d 5h  │
└─────────────┴─────────┴────────┘

Endpoints
---------
https://abc123.provider.akash.network:443
```

---

### `morpheus fund`

Add funds to deployment escrow.

```bash
morpheus fund [options]
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-d, --dseq <dseq>` | Deployment sequence number | Latest |
| `-a, --amount <amount>` | Amount in USDC | From config |
| `--currency <currency>` | Source currency | `USDC` |
| `--skip-staking` | Don't stake MOR portion | `false` |
| `--auto` | Non-interactive mode | `false` |

#### Funding Flow

```
1. Check current escrow balance
2. Calculate required AKT
3. Execute USDC → AKT swap
4. Deposit AKT to escrow
5. Optionally stake MOR portion
```

#### Examples

```bash
# Interactive funding
morpheus fund

# Fund specific amount
morpheus fund --amount 10

# Fund specific deployment
morpheus fund --dseq 12345678 --amount 5

# Skip MOR staking
morpheus fund --amount 10 --skip-staking

# Automated (for scripts/watchdog)
morpheus fund --amount 5 --auto
```

#### Output

```
Morpheus Fund
=============

Current escrow balance: 0.45 AKT
Estimated remaining: ~2 days

Funding Details
---------------
Amount: 10.00 USDC
Split:
  - 60% (6.00 USDC) → MOR Staking
  - 40% (4.00 USDC) → AKT Swap

Executing swap...
  Route: USDC (Base) → AKT (Akash)
  Rate: 1 USDC = 2.45 AKT
  Received: 9.80 AKT

Depositing to escrow...
  TX: DEF456...
  New balance: 10.25 AKT

Staking MOR...
  Amount: 6.00 USDC equivalent
  TX: GHI789...

Funding complete!
New escrow balance: 10.25 AKT
Estimated runtime: ~30 days
```

---

## Configuration File

### `morpheus.yaml` Reference

```yaml
# Project metadata
project:
  name: my-agent              # Required: Project name
  version: 1.0.0              # Optional: Version string

# Deployment template
template: ai-agent            # ai-agent | mcp-server | website | custom

# Network selection
network: mainnet              # mainnet | testnet (Base Sepolia + Akash Sandbox)

# Provider configuration
provider:
  region: us-west             # Preferred region (hint only)

# Funding configuration
funding:
  source: smart-wallet        # smart-wallet | ephemeral
  currency: USDC              # USDC | AKT
  initialDeposit: 10.00       # Initial deposit amount
  autoTopUp:
    enabled: true             # Enable gas station
    threshold: 0.10           # Top-up when < 10% remains
    amount: 5.00              # Amount to add each time

# Resource requirements
resources:
  cpu: 2                      # CPU cores
  memory: 4Gi                 # Memory (Mi, Gi)
  storage: 10Gi               # Persistent storage
  gpu:
    enabled: true             # Enable GPU
    model: rtx4090            # GPU model
    count: 1                  # Number of GPUs

# Runtime configuration
runtime:
  replicas: 1                 # Number of instances
  healthCheck:
    path: /health             # Health check endpoint
    interval: 30s             # Check interval
    timeout: 5s               # Timeout per check
    retries: 3                # Retries before unhealthy

# Environment variables
env:
  NODE_ENV: production
  PORT: "8000"
  # Sealed secrets (encrypted)
  ANTHROPIC_API_KEY: sealed:v1:base64...
  DATABASE_URL: sealed:v1:base64...

# Build configuration (optional)
build:
  dockerfile: Dockerfile      # Path to Dockerfile
  context: .                  # Build context
  args:                       # Build arguments
    NODE_ENV: production

# Registry configuration (optional)
registry:
  url: ghcr.io               # Registry URL
  username: $GITHUB_USER      # Registry username
  password: $GITHUB_TOKEN     # Registry password/token
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MORPHEUS_CONFIG` | Config file path | `./morpheus.yaml` |
| `MORPHEUS_WALLET_PATH` | Wallet file path | `~/.morpheus/wallet.json` |
| `AKASH_NODE` | Akash RPC endpoint | `https://rpc.akashnet.net:443` |
| `AKASH_CHAIN_ID` | Akash chain ID | `akashnet-2` |
| `BASE_RPC_URL` | Base network RPC | `https://mainnet.base.org` |
| `SKIP_GO_API_URL` | Skip Go API endpoint | `https://api.skip.money` |
| `DEBUG` | Debug namespaces | (none) |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error |
| `2` | Configuration error |
| `3` | Build error |
| `4` | Network error |
| `5` | Deployment error |
| `6` | Funding error |

---

## Scripting Examples

### CI/CD Deployment

```bash
#!/bin/bash
set -e

# Deploy and capture DSEQ
OUTPUT=$(morpheus deploy --json)
DSEQ=$(echo "$OUTPUT" | jq -r '.dseq')

# Wait for healthy
sleep 30

# Check status
STATUS=$(morpheus status --dseq "$DSEQ" --json | jq -r '.state')

if [ "$STATUS" != "active" ]; then
  echo "Deployment failed!"
  exit 1
fi

echo "Deployment $DSEQ is active"
```

### Automated Monitoring

```bash
#!/bin/bash

# Check escrow balance and top-up if needed
BALANCE=$(morpheus status --json | jq -r '.escrowBalance')
THRESHOLD=1.0

if (( $(echo "$BALANCE < $THRESHOLD" | bc -l) )); then
  morpheus fund --amount 5 --auto
fi
```
