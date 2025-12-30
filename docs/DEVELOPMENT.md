# Development Environment Setup

This guide walks through setting up a local development environment for Morpheus Deploy.

## Prerequisites

### Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | JavaScript runtime |
| pnpm | 8+ | Package manager |
| Docker | 24+ | Container builds |
| Git | 2.40+ | Version control |

### Optional Tools

| Tool | Purpose |
|------|---------|
| PostgreSQL 15 | Local database testing |
| `akash` CLI | Direct Akash network interaction |
| `gh` CLI | GitHub operations |

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/morpheus-deploy/morpheus-deploy.git
cd morpheus-deploy
```

### 2. Install Dependencies

```bash
# Install pnpm if not present
npm install -g pnpm

# Install all workspace dependencies
pnpm install
```

### 3. Build Packages

```bash
# Build all packages in dependency order
pnpm build

# Or build specific packages
pnpm --filter @morpheus/core build
pnpm --filter @morpheus/contracts build
pnpm --filter morpheus-cli build
```

### 4. Link CLI Globally

```bash
cd apps/cli
pnpm link --global

# Verify installation
morpheus --version
```

## Environment Configuration

### Local Environment File

Create `.env.local` in the repository root:

```bash
# Network Configuration
AKASH_NODE=https://rpc.akashnet.net:443
AKASH_CHAIN_ID=akashnet-2
BASE_RPC_URL=https://mainnet.base.org

# For testnet development
# AKASH_NODE=https://rpc.sandbox-01.aksh.pw:443
# AKASH_CHAIN_ID=sandbox-01
# BASE_RPC_URL=https://sepolia.base.org

# Skip Go API
SKIP_GO_API_URL=https://api.skip.money

# Local services
MORPHEUS_RELAY_URL=http://localhost:8080
WORKFLOW_POSTGRES_URL=postgres://postgres:password@localhost:5432/workflow

# Development flags
DEBUG=morpheus:*
LOG_LEVEL=debug
```

### Wallet Configuration

For development, create a test wallet:

```bash
# Initialize with test wallet
morpheus init --dev

# This creates ~/.morpheus/wallet.dev.json with a test key
```

**Never use development wallets with real funds.**

## Running Services

### PostgreSQL (Local)

```bash
# Using Docker
docker compose -f docker/docker-compose.dev.yml up postgres -d

# Or using the sidecar image
docker run -d \
  --name morpheus-postgres \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=workflow \
  morpheus/postgres-sidecar:latest
```

### Vector Log Collector

```bash
# Start Vector for log aggregation
docker compose -f docker/docker-compose.dev.yml up vector -d
```

### Full Development Stack

```bash
# Start all services
docker compose -f docker/docker-compose.dev.yml up -d

# View logs
docker compose -f docker/docker-compose.dev.yml logs -f
```

## Development Workflow

### Running in Watch Mode

```bash
# Watch all packages
pnpm dev

# Watch specific package
pnpm --filter @morpheus/core dev
pnpm --filter morpheus-cli dev
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific package tests
pnpm --filter @morpheus/core test
```

### Linting

```bash
# Lint all packages
pnpm lint

# Fix auto-fixable issues
pnpm lint:fix

# Type checking
pnpm typecheck
```

### Building

```bash
# Clean build
pnpm clean && pnpm build

# Build with source maps
pnpm build:dev
```

## Project Structure

```
morpheus-deploy/
├── apps/
│   └── cli/                    # CLI application
│       ├── src/
│       │   ├── cli.ts          # Entry point
│       │   ├── commands/       # Command implementations
│       │   │   ├── init.ts
│       │   │   ├── deploy.ts
│       │   │   ├── logs.ts
│       │   │   ├── status.ts
│       │   │   └── fund.ts
│       │   └── lib/            # Shared utilities
│       │       ├── config.ts
│       │       ├── wallet.ts
│       │       └── deployment.ts
│       ├── tests/              # CLI tests
│       └── package.json
│
├── packages/
│   ├── core/                   # Core business logic
│   │   ├── src/
│   │   │   ├── sdl/            # SDL synthesis
│   │   │   ├── build/          # Docker builds
│   │   │   └── economic/       # Swap logic
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── contracts/              # Blockchain integrations
│   │   ├── src/
│   │   │   ├── wallet/         # Smart wallet
│   │   │   ├── authz/          # Cosmos AuthZ
│   │   │   ├── staking/        # MOR staking
│   │   │   └── akash/          # Akash client
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── adapters/               # Durability adapters
│   │   ├── src/
│   │   │   └── postgres/       # PostgreSQL world
│   │   ├── tests/
│   │   └── package.json
│   │
│   └── templates/              # Deployment templates
│       ├── src/
│       ├── tests/
│       └── package.json
│
├── docker/
│   ├── sidecars/               # Sidecar containers
│   │   ├── postgres/
│   │   └── vector/
│   ├── build-engine/           # Build templates
│   └── docker-compose.dev.yml
│
├── scripts/                    # Utility scripts
├── docs/                       # Documentation
└── package.json                # Root package.json
```

## Package Dependencies

```
┌─────────────────┐
│   morpheus-cli  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌──────────┐
│ core  │ │contracts │
└───┬───┘ └────┬─────┘
    │          │
    └────┬─────┘
         │
         ▼
    ┌─────────┐
    │adapters │
    └─────────┘
         │
         ▼
    ┌─────────┐
    │templates│
    └─────────┘
```

## Testing Against Testnet

### Akash Sandbox

```bash
# Set testnet environment
export AKASH_NODE=https://rpc.sandbox-01.aksh.pw:443
export AKASH_CHAIN_ID=sandbox-01

# Get testnet tokens from faucet
# https://faucet.sandbox-01.aksh.pw/

# Deploy to testnet
morpheus deploy --network testnet
```

### Base Sepolia

```bash
# Set testnet RPC
export BASE_RPC_URL=https://sepolia.base.org

# Get testnet ETH from faucet
# https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
```

## Debugging

### Enable Debug Logging

```bash
# All debug output
DEBUG=morpheus:* morpheus deploy

# Specific modules
DEBUG=morpheus:sdl,morpheus:akash morpheus deploy
```

### VS Code Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CLI",
      "program": "${workspaceFolder}/apps/cli/dist/cli.js",
      "args": ["deploy", "--dry-run"],
      "cwd": "${workspaceFolder}",
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/**/dist/**/*.js"]
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run", "--reporter=verbose"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    }
  ]
}
```

### Common Issues

#### 1. Build Failures

```bash
# Clear all build artifacts
pnpm clean

# Clear node_modules
rm -rf node_modules packages/*/node_modules apps/*/node_modules

# Reinstall
pnpm install && pnpm build
```

#### 2. TypeScript Errors

```bash
# Check for type errors across all packages
pnpm typecheck

# Rebuild TypeScript references
pnpm build --force
```

#### 3. Docker Build Issues

```bash
# Prune Docker cache
docker system prune -a

# Build without cache
docker build --no-cache -t morpheus-test .
```

#### 4. Database Connection

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql postgres://postgres:password@localhost:5432/workflow -c "SELECT 1"

# View logs
docker logs morpheus-postgres
```

## Contributing Workflow

1. Create feature branch from `main`
2. Make changes with tests
3. Run `pnpm lint && pnpm test`
4. Submit PR with description

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.
