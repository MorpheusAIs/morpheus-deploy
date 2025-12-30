# CLAUDE.md - Project Guide for Claude Code

## Project Overview

**Morpheus Deploy** is a decentralized deployment platform ("Vercel for Akash Network") that enables one-command deployment of AI agents, MCP servers, and web applications to Akash Network with crypto-native funding.

## Architecture

### Monorepo Structure (Turborepo + pnpm)

```
morpheus-deploy/
├── apps/
│   └── cli/                    # Main CLI application (morpheus)
├── packages/
│   ├── core/                   # Core business logic
│   │   └── src/
│   │       ├── sdl/            # SDL synthesis & validation
│   │       ├── build/          # Docker build engine
│   │       └── economic/       # Swap & staking (Skip Go integration)
│   ├── contracts/              # Blockchain integrations
│   │   └── src/
│   │       ├── wallet/         # Coinbase Smart Wallet (ERC-4337)
│   │       ├── akash/          # Akash deployment client
│   │       ├── authz/          # Cosmos AuthZ grants
│   │       └── staking/        # MOR staking
│   ├── adapters/               # Durability adapters
│   │   └── src/
│   │       └── postgres/       # PostgreSQL workflow persistence
│   └── templates/              # Deployment templates
│       └── src/
│           ├── ai-agent/       # GPU-enabled AI agents
│           ├── mcp-server/     # MCP servers
│           ├── website/        # Static/dynamic websites
│           └── custom/         # Custom deployments
└── docs/                       # Documentation
```

### Package Dependencies

```
morpheus (CLI)
    └── @morpheus-deploy/core
            └── @morpheus-deploy/contracts
    └── @morpheus-deploy/templates
    └── @morpheus-deploy/adapters
```

## Key Technologies

- **TypeScript** - Strict mode enabled
- **Turborepo** - Monorepo build orchestration
- **pnpm** - Package management with workspaces
- **Vitest** - Testing framework
- **tsup** - TypeScript bundler (ESM output)
- **viem** - Ethereum client library
- **CosmJS** - Cosmos SDK client
- **eciesjs** - ECIES encryption for sealed secrets

## Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @morpheus-deploy/core test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Network Configuration

The project supports both mainnet and testnet:

| Network | Base Chain | Akash Chain | Config |
|---------|------------|-------------|--------|
| mainnet | Base (8453) | akashnet-2 | Default |
| testnet | Base Sepolia (84532) | sandbox-01 | `network: testnet` |

### Key Addresses (Testnet - Base Sepolia)

- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **MOR**: `0x5c80ddd187054e1e4abbffcd750498e81d34ffa3`
- **Smart Wallet Factory**: `0x0BA5ED0c6AA8c49038F819E587E2633c4A9F428a`

Configuration is centralized in:
- `packages/contracts/src/constants.ts` - Chain configs, token addresses
- `packages/contracts/src/staking/abi.ts` - Staking contract addresses

## Code Conventions

### TypeScript

- Use strict TypeScript with no `any` types where possible
- Export types alongside implementations
- Use `.js` extensions in imports (ESM)

### Testing

- Tests live in `tests/` directory within each package
- Use Vitest with `vi.mock()` for mocking
- Mock external dependencies (fs, network calls)
- Test file naming: `*.test.ts`

### Configuration Types

The main config type is `MorpheusConfig` in `packages/core/src/sdl/types.ts`:

```typescript
interface MorpheusConfig {
  project: string;
  template: 'ai-agent' | 'mcp-server' | 'website' | 'custom';
  provider: 'akash' | 'render' | 'filecoin';
  network?: 'mainnet' | 'testnet';
  funding?: FundingConfig;
  resources?: ResourceConfig;
  runtime?: RuntimeConfig;
  env?: EnvironmentConfig;
}
```

## Important Files

| File | Purpose |
|------|---------|
| `packages/contracts/src/constants.ts` | Chain configs, token addresses |
| `packages/core/src/sdl/types.ts` | Core TypeScript types |
| `packages/core/src/economic/skip-go.ts` | Cross-chain swap integration |
| `packages/core/src/economic/engine.ts` | Economic logic (swaps, staking) |
| `packages/contracts/src/akash/client.ts` | Akash deployment client |
| `packages/templates/src/manager.ts` | Template management |
| `apps/cli/src/cli.ts` | CLI entry point |

## Common Workflows

### Adding a New Feature

1. Identify which package owns the feature
2. Add types to relevant `types.ts`
3. Implement in source files
4. Add tests in `tests/` directory
5. Update exports in `src/index.ts`
6. Run `pnpm build && pnpm test`

### Updating Token/Contract Addresses

1. Edit `packages/contracts/src/constants.ts`
2. Update `CHAIN_CONFIG` for the relevant network
3. Run tests to verify

### Adding Network Support

1. Add chain config to `packages/contracts/src/constants.ts`
2. Add chain ID mapping in `packages/core/src/economic/skip-go.ts`
3. Update documentation in `README.md`

## Testing Patterns

### Mocking External Services

```typescript
// Mock fs
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

// Mock network client
vi.mock('../src/client', () => ({
  Client: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue({ data: {} }),
  })),
}));
```

### Testing with MorpheusConfig

```typescript
const config: MorpheusConfig = {
  project: 'test-project',
  template: 'ai-agent',
  provider: 'akash',
  network: 'testnet',  // Use testnet for tests
  resources: {
    cpu: 2,
    memory: '4Gi',
    storage: '10Gi',
  },
};
```

## Deployment Flow

```
morpheus deploy
    │
    ├── 1. Parse morpheus.yaml
    ├── 2. Build Docker image
    ├── 3. Push to registry
    ├── 4. Synthesize SDL
    ├── 5. Execute USDC → AKT swap (Skip Go)
    ├── 6. Create Akash deployment
    ├── 7. Wait for provider bids
    ├── 8. Create lease
    ├── 9. Send manifest
    └── 10. Verify deployment
```

## Known Limitations

- **Staking Contract**: Addresses are placeholders (`0x000...`) - needs deployment
- **Skip Go Testnet**: API may not have liquidity for testnet chains
- **MOR Mainnet**: Token address not yet configured

## Links

- [Akash Network Docs](https://akash.network/docs)
- [Skip Go API](https://api.skip.money/docs)
- [Coinbase Smart Wallet](https://www.smartwallet.dev/)
- [Base Sepolia Explorer](https://sepolia.basescan.org)
