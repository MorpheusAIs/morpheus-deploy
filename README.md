# Morpheus Deploy

**The Vercel for DePin: Decentralized Deployment Platform for AI Agents**

Morpheus is a developer-first CLI tool that brings the simplicity of Vercel deployments to decentralized infrastructure. Deploy AI agents, MCP servers, and web applications to Akash Network with a single command.

```bash
npx morpheus-deploy init
npx morpheus-deploy deploy
```

## Why Morpheus?

Modern AI agents need **sovereign infrastructure**—compute that can't be shut down, censored, or rate-limited. Morpheus solves three critical problems:

| Problem | Traditional Cloud | Morpheus Solution |
|---------|------------------|-------------------|
| **Cloud Bottleneck** | Centralized APIs with rate limits | Decentralized Akash compute |
| **DX Gap** | Complex Kubernetes manifests | One-command deployment |
| **Economic Friction** | Credit cards, KYC, invoices | Crypto-native funding with USDC |

## Features

- **One-Command Deploy** - From code to running container in under 60 seconds
- **Smart Wallet Identity** - Passkey-based authentication, no seed phrases
- **Cross-Chain Funding** - Pay with USDC on Base, deploy on Akash
- **Durable Execution** - Built-in PostgreSQL for workflow state persistence
- **Real-Time Logs** - WebSocket-based log streaming
- **Auto Top-Up** - Gas Station monitors escrow and refills automatically
- **Multi-Template Support** - AI agents, MCP servers, websites, custom deployments

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker (for local builds)

### Installation

```bash
# Clone the repository
git clone https://github.com/morpheus-deploy/morpheus-deploy.git
cd morpheus-deploy

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Link CLI globally
cd apps/cli && pnpm link --global
```

### Initialize a Project

```bash
# Interactive setup
morpheus init

# Or with flags
morpheus init --template ai-agent --name my-agent
```

This creates a `morpheus.yaml` configuration:

```yaml
project:
  name: my-agent
  version: 1.0.0

template: ai-agent
network: mainnet  # or 'testnet' for Base Sepolia + Akash Sandbox

provider:
  region: us-west

funding:
  source: smart-wallet
  currency: USDC
  initialDeposit: 10.00
  autoTopUp:
    enabled: true
    threshold: 0.10
    amount: 5.00

resources:
  cpu: 2
  memory: 4Gi
  storage: 10Gi
  gpu:
    enabled: true
    model: rtx4090
    count: 1

runtime:
  replicas: 1
  healthCheck:
    path: /health
    interval: 30s

env:
  NODE_ENV: production
  # Secrets are encrypted with ECIES
  ANTHROPIC_API_KEY: sealed:v1:base64encodedciphertext...
```

### Deploy

```bash
# Full deployment
morpheus deploy

# With options
morpheus deploy --dry-run        # Preview without deploying
morpheus deploy --skip-build     # Use existing image
morpheus deploy --verbose        # Detailed output
```

### Monitor

```bash
# Stream logs
morpheus logs

# Check status
morpheus status

# Fund escrow
morpheus fund --amount 5
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Developer Machine                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ morpheus.yaml│  │  Dockerfile │  │ Source Code │  │ Smart Wallet│    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │            │
│         └────────────────┴────────────────┴────────────────┘            │
│                                   │                                      │
│                          ┌────────▼────────┐                            │
│                          │  Morpheus CLI   │                            │
│                          └────────┬────────┘                            │
└───────────────────────────────────│─────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│  Base Network │          │  Skip Go API  │          │ Akash Network │
│  (Chain 8453) │          │ Cross-Chain   │          │  (Cosmos SDK) │
│               │          │    Swaps      │          │               │
│ Smart Wallet  │───USDC──▶│               │───AKT───▶│  Deployment   │
│ MOR Staking   │          │  Route Quote  │          │  Bid Matching │
└───────────────┘          │  Execute Swap │          │  Lease Create │
                           └───────────────┘          │  Manifest     │
                                                      └───────┬───────┘
                                                              │
                                                              ▼
                                                    ┌─────────────────┐
                                                    │ Akash Provider  │
                                                    │                 │
                                                    │ ┌─────────────┐ │
                                                    │ │   Agent     │ │
                                                    │ │  Container  │ │
                                                    │ └──────┬──────┘ │
                                                    │        │        │
                                                    │ ┌──────▼──────┐ │
                                                    │ │  PostgreSQL │ │
                                                    │ │   Sidecar   │ │
                                                    │ └─────────────┘ │
                                                    │ ┌─────────────┐ │
                                                    │ │   Vector    │ │
                                                    │ │   Sidecar   │ │
                                                    │ └─────────────┘ │
                                                    └─────────────────┘
```

## Monorepo Structure

```
morpheus-deploy/
├── apps/
│   └── cli/                 # Main CLI application
│       ├── src/
│       │   ├── commands/    # init, deploy, logs, status, fund
│       │   └── lib/         # config, wallet, deployment utilities
│       └── package.json
├── packages/
│   ├── core/                # Core functionality
│   │   └── src/
│   │       ├── sdl/         # SDL synthesis & validation
│   │       ├── build/       # Docker build engine
│   │       └── economic/    # Swap & staking logic
│   ├── contracts/           # Blockchain integrations
│   │   └── src/
│   │       ├── wallet/      # Smart wallet & ephemeral keys
│   │       ├── authz/       # Cosmos AuthZ grants
│   │       ├── staking/     # MOR staking
│   │       └── akash/       # Akash client & messages
│   ├── adapters/            # Durability adapters
│   │   └── src/
│   │       └── postgres/    # @workflow/world-postgres
│   └── templates/           # Deployment templates
│       └── src/
│           ├── ai-agent/
│           ├── mcp-server/
│           ├── website/
│           └── custom/
├── docker/
│   ├── sidecars/
│   │   ├── postgres/        # PostgreSQL sidecar
│   │   └── vector/          # Log shipping sidecar
│   └── build-engine/        # Dockerfile templates
├── scripts/
│   ├── migrate-and-start.sh # Container entrypoint
│   ├── migrate.js           # Database migrations
│   └── watchdog.sh          # Escrow monitoring
└── docs/                    # Documentation
```

## Documentation

- [Development Setup](./docs/DEVELOPMENT.md) - Local environment configuration
- [Architecture](./docs/ARCHITECTURE.md) - System design and components
- [CLI Reference](./docs/CLI.md) - Command documentation
- [Smart Wallet](./docs/WALLET.md) - Passkey authentication and ephemeral keys
- [SDL Synthesis](./docs/SDL.md) - How deployments are generated
- [Templates](./docs/TEMPLATES.md) - Available deployment templates
- [Production Deployment](./docs/DEPLOYMENT.md) - Going live guide

## How It Works

### 1. Smart Wallet Creation

When you first run `morpheus init`, a Coinbase Smart Wallet is created using passkey authentication:

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Touch ID / Face │────▶│   WebAuthn API   │────▶│  Smart Wallet    │
│       ID         │     │   (Passkey)      │     │  (ERC-4337)      │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

No seed phrases. No private key management. Your biometric IS your wallet.

### 2. Ephemeral Key Generation

For each deployment, an ephemeral key is generated with limited AuthZ permissions:

```typescript
const permissions = [
  '/akash.deployment.v1beta3.MsgCreateDeployment',
  '/akash.deployment.v1beta3.MsgUpdateDeployment',
  '/akash.deployment.v1beta3.MsgCloseDeployment',
  '/akash.deployment.v1beta3.MsgDepositDeployment',
];
```

Keys expire after 24 hours, limiting blast radius if compromised.

### 3. Cross-Chain Funding

USDC on Base is swapped to AKT on Akash via Skip Go:

```
USDC (Base) ─▶ Skip Go Route ─▶ AKT (Akash)
     │              │               │
     │         Axelar/IBC          │
     │              │               │
     └──────── Atomic Swap ────────┘
```

The 60/40 split automatically stakes 60% to MOR for yield.

### 4. SDL Synthesis

Your `morpheus.yaml` is transformed into a full Akash SDL with sidecars:

```yaml
# Generated SDL includes:
services:
  agent:        # Your application
  postgres:     # Durable state storage
  log-shipper:  # Vector log forwarding
```

### 5. Deployment Flow

```
Build ─▶ Push ─▶ SDL ─▶ Broadcast ─▶ Bids ─▶ Lease ─▶ Manifest ─▶ Live!
```

## Configuration Reference

### morpheus.yaml

| Field | Type | Description |
|-------|------|-------------|
| `project.name` | string | Project identifier |
| `project.version` | string | Semantic version |
| `template` | string | `ai-agent`, `mcp-server`, `website`, `custom` |
| `network` | string | `mainnet` or `testnet` |
| `provider.region` | string | Preferred region |
| `funding.source` | string | `smart-wallet` or `ephemeral` |
| `funding.currency` | string | `USDC`, `AKT` |
| `funding.initialDeposit` | number | Initial escrow amount |
| `funding.autoTopUp.enabled` | boolean | Enable gas station |
| `funding.autoTopUp.threshold` | number | Top-up trigger (0.0-1.0) |
| `resources.cpu` | number | CPU cores |
| `resources.memory` | string | Memory limit (e.g., `4Gi`) |
| `resources.storage` | string | Storage size |
| `resources.gpu.enabled` | boolean | Enable GPU |
| `resources.gpu.model` | string | GPU model |
| `runtime.replicas` | number | Instance count |
| `runtime.healthCheck.path` | string | Health endpoint |
| `env` | object | Environment variables |

### Testnet Configuration

For development and testing, use testnet networks:

```yaml
# morpheus.yaml for testnet
network: testnet  # Uses Base Sepolia + Akash Sandbox
```

| Network | Base Chain | Akash Chain | MOR Token |
|---------|------------|-------------|-----------|
| `mainnet` | Base (8453) | akashnet-2 | TBD |
| `testnet` | Base Sepolia (84532) | sandbox-01 | `0x5c80...ffa3` |

Testnet tokens:
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia)
- **MOR**: `0x5c80ddd187054e1e4abbffcd750498e81d34ffa3` (Base Sepolia)
- **AKT**: Available from Akash Sandbox faucet

### Environment Variables

```bash
# Wallet
MORPHEUS_WALLET_PATH=~/.morpheus/wallet.json

# Network (mainnet)
AKASH_NODE=https://rpc.akashnet.net:443
AKASH_CHAIN_ID=akashnet-2
BASE_RPC_URL=https://mainnet.base.org

# Network (testnet)
# AKASH_NODE=https://rpc.sandbox-01.akash.network:443
# AKASH_CHAIN_ID=sandbox-01
# BASE_RPC_URL=https://sepolia.base.org

# Services
SKIP_GO_API_URL=https://api.skip.money
MORPHEUS_RELAY_URL=http://localhost:8080
```

## Security

- **No Private Keys** - Smart Wallet uses passkeys, no seed phrases stored
- **Ephemeral Access** - Deployment keys auto-expire after 24 hours
- **Sealed Secrets** - Environment variables encrypted with ECIES
- **Limited AuthZ** - Ephemeral keys can only perform deployment operations
- **Non-Custodial** - Your funds never leave your control

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Links

- [Akash Network](https://akash.network)
- [Coinbase Smart Wallet](https://www.smartwallet.dev/)
- [Skip Go API](https://api.skip.money/docs)
- [Morpheus Staking](https://mor.org)

---

Built with sovereignty in mind. Your agents, your infrastructure, your rules.
