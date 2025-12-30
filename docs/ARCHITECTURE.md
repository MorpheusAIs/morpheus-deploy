# Architecture

This document describes the system architecture of Morpheus Deploy.

## Overview

Morpheus is a decentralized deployment platform that abstracts the complexity of deploying to Akash Network behind a simple CLI interface. It combines:

- **Coinbase Smart Wallet** for passkey-based identity
- **Cross-chain swaps** via Skip Go for seamless funding
- **SDL synthesis** for generating Akash deployment manifests
- **Durable execution** via PostgreSQL for workflow state

## System Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Morpheus CLI                                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │  init   │  │ deploy  │  │  logs   │  │ status  │  │  fund   │          │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘          │
│       │            │            │            │            │                 │
│       └────────────┴────────────┴────────────┴────────────┘                 │
│                                    │                                         │
│                           ┌────────▼────────┐                               │
│                           │   Core Engine   │                               │
│                           └────────┬────────┘                               │
└────────────────────────────────────│────────────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│    @morpheus    │        │    @morpheus    │        │    @morpheus    │
│      /core      │        │   /contracts    │        │    /adapters    │
│                 │        │                 │        │                 │
│ - SDL Synthesis │        │ - Smart Wallet  │        │ - PostgreSQL    │
│ - Build Engine  │        │ - Ephemeral Key │        │   World         │
│ - Economic Eng. │        │ - AuthZ Grants  │        │ - Migrations    │
│                 │        │ - Akash Client  │        │                 │
└────────┬────────┘        └────────┬────────┘        └────────┬────────┘
         │                          │                          │
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│   Docker Hub    │        │  Base Network   │        │   PostgreSQL    │
│   (Registry)    │        │  Akash Network  │        │    (Sidecar)    │
└─────────────────┘        └─────────────────┘        └─────────────────┘
```

## Package Architecture

### @morpheus/core

The core package contains business logic independent of blockchain interactions.

#### SDL Synthesizer

Converts `morpheus.yaml` configuration into Akash SDL manifests:

```typescript
interface SDLConfig {
  projectName: string;
  image: string;
  resources: ResourceRequirements;
  env: Record<string, string>;
  ports: PortMapping[];
  sidecars: SidecarConfig;
}

interface SDLOutput {
  version: '2.0';
  services: Record<string, ServiceDefinition>;
  profiles: ProfileDefinition;
  deployment: DeploymentDefinition;
}
```

The synthesizer injects sidecars automatically:

```
┌─────────────────────────────────────────────────┐
│              Akash Pod (Deployment)             │
│                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   Agent     │  │  PostgreSQL │  │ Vector  │ │
│  │  Container  │  │   Sidecar   │  │ Sidecar │ │
│  │             │  │             │  │         │ │
│  │  Port 8000 ─┼──┼── Port 5432 │  │ Port    │ │
│  │             │  │             │  │ 8686    │ │
│  └─────────────┘  └─────────────┘  └─────────┘ │
│                                                 │
│  Shared: /data volume, internal network        │
└─────────────────────────────────────────────────┘
```

#### Build Engine

Handles Docker image construction:

```typescript
class BuildEngine {
  // Detect framework from package.json
  async detectFramework(projectPath: string): Promise<FrameworkType>;

  // Generate optimized Dockerfile
  async generateDockerfile(framework: FrameworkType): Promise<string>;

  // Build and optionally push
  async build(options: BuildOptions): Promise<BuildResult>;
}
```

Supported frameworks:
- Next.js (standalone output)
- Node.js (generic)
- Python (pip/poetry)

#### Economic Engine

Manages cross-chain funding:

```typescript
class EconomicEngine {
  // Execute USDC → AKT swap via Skip Go
  async executeSwap(options: SwapConfig): Promise<SwapResult>;

  // Check if escrow needs top-up
  async checkEscrow(dseq: string): Promise<EscrowStatus>;

  // Automated top-up (Gas Station)
  async autoTopUp(dseq: string, balance: number, burnRate: number): Promise<SwapResult | null>;
}
```

60/40 funding split:
```
USDC Input
    │
    ├── 60% ──▶ MOR Staking (yield)
    │
    └── 40% ──▶ AKT Swap ──▶ Deployment Escrow
```

### @morpheus/contracts

Blockchain integration layer.

#### Smart Wallet

Coinbase Smart Wallet implementation using ERC-4337:

```typescript
class SmartWalletManager {
  // Create new wallet with passkey
  async createSmartWallet(): Promise<WalletInfo>;

  // Get wallet balance
  async getBalance(address: Address, token: 'ETH' | 'USDC'): Promise<bigint>;

  // Execute transaction via bundler
  async sendTransaction(tx: TransactionRequest): Promise<Hash>;
}
```

Passkey authentication flow:
```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Biometric│────▶│ WebAuthn │────▶│ Signature│────▶│  Smart   │
│  (User)  │     │   API    │     │          │     │  Wallet  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

#### Ephemeral Keys

Temporary keys with limited permissions:

```typescript
interface EphemeralKeyConfig {
  parentWallet: Address;
  permissions: AuthZPermission[];
  expiration: Date;  // Default: 24 hours
}

class EphemeralKeyManager {
  // Generate new ephemeral key
  async generate(config: EphemeralKeyConfig): Promise<EphemeralKey>;

  // Encrypt and store
  async store(key: EphemeralKey, password: string): Promise<void>;

  // Revoke early
  async revoke(keyId: string): Promise<void>;
}
```

#### AuthZ Grants

Cosmos SDK authorization for limited operations:

```typescript
const DEPLOYMENT_PERMISSIONS: AuthZPermission[] = [
  { msgType: '/akash.deployment.v1beta3.MsgCreateDeployment' },
  { msgType: '/akash.deployment.v1beta3.MsgUpdateDeployment' },
  { msgType: '/akash.deployment.v1beta3.MsgCloseDeployment' },
  { msgType: '/akash.deployment.v1beta3.MsgDepositDeployment' },
];

class AuthZManager {
  // Grant permissions from master to ephemeral
  async grantPermissions(
    granter: string,
    grantee: string,
    permissions: AuthZPermission[],
    expiration: Date
  ): Promise<TxHash>;

  // Revoke all grants
  async revokeAllGrants(granter: string, grantee: string): Promise<TxHash>;
}
```

#### Akash Client

Full deployment lifecycle management:

```typescript
class AkashClient {
  // Create deployment on network
  async createDeployment(params: CreateDeploymentParams): Promise<DeploymentResult>;

  // Wait for provider bids
  async waitForBids(owner: string, dseq: string, timeout?: number): Promise<Bid[]>;

  // Select provider and create lease
  async createLease(owner: string, dseq: string, provider: string): Promise<LeaseResult>;

  // Upload manifest to provider
  async sendManifest(provider: string, dseq: string, manifest: string): Promise<void>;

  // Query deployment status
  async getDeploymentStatus(owner: string, dseq: string): Promise<DeploymentStatus>;

  // Close deployment
  async closeDeployment(owner: string, dseq: string): Promise<TxHash>;
}
```

### @morpheus/adapters

Durability layer for workflow persistence.

#### PostgreSQL World

Implementation of the `World` interface for durable execution:

```typescript
interface World {
  // Start new workflow run
  startRun(workflowId: string, input: unknown): Promise<string>;

  // Execute task with exactly-once semantics
  executeTask<T>(runId: string, stepId: string, task: Task<T>): Promise<TaskResult<T>>;

  // Resume interrupted workflow
  resumeRun(runId: string): Promise<ResumeState>;

  // Query workflow logs
  queryLogs(runId: string, options?: LogQueryOptions): Promise<WorkflowLog[]>;
}
```

Database schema:
```sql
-- Workflow runs
CREATE TABLE workflow_runs (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  input JSONB,
  output JSONB,
  status TEXT NOT NULL DEFAULT 'running',
  error JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Individual steps
CREATE TABLE workflow_steps (
  run_id TEXT REFERENCES workflow_runs(id),
  step_id TEXT NOT NULL,
  parent_step_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  input JSONB,
  output JSONB,
  error JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  task_data TEXT,
  retry_count INTEGER DEFAULT 0,
  PRIMARY KEY (run_id, step_id)
);

-- Execution logs
CREATE TABLE workflow_logs (
  id SERIAL PRIMARY KEY,
  run_id TEXT REFERENCES workflow_runs(id),
  step_id TEXT,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### @morpheus/templates

Deployment template definitions.

#### Template Structure

```typescript
interface Template {
  name: string;
  description: string;
  defaultResources: ResourceRequirements;
  sidecars: SidecarConfig;

  // Generate SDL for this template
  generateSDL(config: TemplateConfig): Promise<SDLOutput>;

  // Validate configuration
  validate(config: TemplateConfig): ValidationResult;
}
```

Available templates:

| Template | Use Case | Default Resources |
|----------|----------|-------------------|
| `ai-agent` | GPU-enabled AI agents | 2 CPU, 4Gi RAM, RTX 4090 |
| `mcp-server` | Model Context Protocol servers | 0.5 CPU, 512Mi RAM |
| `website` | Static/dynamic websites | 0.5 CPU, 256Mi RAM |
| `custom` | Full configuration control | User-defined |

## Data Flow

### Deployment Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Config  │────▶│  Build  │────▶│  Push   │────▶│   SDL   │
│  Parse  │     │  Image  │     │   to    │     │  Synth  │
│         │     │         │     │ Registry│     │         │
└─────────┘     └─────────┘     └─────────┘     └────┬────┘
                                                     │
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌────▼────┐
│ Running │◀────│Manifest │◀────│  Lease  │◀────│  Bids   │
│   App   │     │  Upload │     │ Create  │     │  Match  │
│         │     │         │     │         │     │         │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
```

### Funding Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User USDC Balance                           │
│                              │                                      │
│                              ▼                                      │
│                    ┌─────────────────────┐                         │
│                    │    Amount Split     │                         │
│                    │    (60% / 40%)      │                         │
│                    └──────────┬──────────┘                         │
│                               │                                     │
│              ┌────────────────┴────────────────┐                   │
│              │                                 │                    │
│              ▼                                 ▼                    │
│    ┌─────────────────┐              ┌─────────────────┐           │
│    │   60% → MOR     │              │   40% → AKT     │           │
│    │    Staking      │              │     Swap        │           │
│    │                 │              │                 │           │
│    │  Base Network   │              │   Skip Go API   │           │
│    │  Contract Call  │              │   Cross-Chain   │           │
│    └─────────────────┘              └────────┬────────┘           │
│                                              │                     │
│                                              ▼                     │
│                                    ┌─────────────────┐            │
│                                    │  Akash Escrow   │            │
│                                    │    Account      │            │
│                                    └─────────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

### Log Streaming Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Akash Provider                               │
│                                                                     │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                   │
│  │  Agent   │────▶│  Vector  │────▶│ WebSocket│                   │
│  │  stdout  │     │ Sidecar  │     │  Server  │                   │
│  │  stderr  │     │          │     │          │                   │
│  └──────────┘     └──────────┘     └─────┬────┘                   │
│                                          │                         │
└──────────────────────────────────────────│─────────────────────────┘
                                           │
                                           │ ws://
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         Morpheus CLI                                 │
│                                                                      │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                    │
│  │ WebSocket│────▶│   Parse  │────▶│ Terminal │                    │
│  │  Client  │     │   & Fmt  │     │  Output  │                    │
│  └──────────┘     └──────────┘     └──────────┘                    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Security Model

### Key Hierarchy

```
┌───────────────────────────────────────────────────────────────┐
│                      Smart Wallet                             │
│                    (Passkey-backed)                           │
│                          │                                    │
│                          │ AuthZ Grant                        │
│                          ▼                                    │
│              ┌─────────────────────┐                         │
│              │   Ephemeral Key     │                         │
│              │  (24hr expiration)  │                         │
│              │                     │                         │
│              │  Permissions:       │                         │
│              │  - CreateDeployment │                         │
│              │  - UpdateDeployment │                         │
│              │  - CloseDeployment  │                         │
│              │  - DepositDeployment│                         │
│              └─────────────────────┘                         │
│                                                               │
│  Cannot: Transfer funds, change wallet, grant new permissions │
└───────────────────────────────────────────────────────────────┘
```

### Secret Encryption

Environment variables are encrypted with ECIES:

```typescript
// Encryption
const sealed = await sealSecret(
  'ANTHROPIC_API_KEY=sk-...',
  walletPublicKey
);
// Result: 'sealed:v1:base64...'

// Decryption (at runtime, in container)
const value = await unsealSecret(sealed, walletPrivateKey);
```

### Trust Model

| Component | Trust Level | Justification |
|-----------|-------------|---------------|
| Smart Wallet | High | User's biometric authentication |
| Ephemeral Keys | Medium | Limited permissions, auto-expire |
| Akash Provider | Low | Can see encrypted manifest |
| Skip Go | Medium | Atomic swaps, no custody |

## Scalability Considerations

### Horizontal Scaling

```
                    ┌─────────────────────┐
                    │   Load Balancer     │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Deployment 1  │  │   Deployment 2  │  │   Deployment 3  │
│                 │  │                 │  │                 │
│  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │
│  │   Agent   │  │  │  │   Agent   │  │  │  │   Agent   │  │
│  └───────────┘  │  │  └───────────┘  │  │  └───────────┘  │
│  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │
│  │ PostgreSQL│  │  │  │ PostgreSQL│  │  │  │ PostgreSQL│  │
│  └───────────┘  │  │  └───────────┘  │  │  └───────────┘  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Shared PostgreSQL  │
                    │    (optional)       │
                    └─────────────────────┘
```

### Resource Limits

| Resource | Default | Max |
|----------|---------|-----|
| CPU | 2 cores | 32 cores |
| Memory | 4Gi | 64Gi |
| Storage | 10Gi | 1Ti |
| GPU | 1x RTX 4090 | 8x H100 |

## Extension Points

### Custom Templates

```typescript
// my-template.ts
import { Template, TemplateConfig, SDLOutput } from '@morpheus/templates';

export const myTemplate: Template = {
  name: 'my-custom-template',
  description: 'Custom deployment configuration',

  defaultResources: {
    cpu: 1,
    memory: '2Gi',
    storage: '5Gi',
  },

  sidecars: {
    postgres: true,
    vector: true,
    custom: [
      {
        name: 'redis',
        image: 'redis:7-alpine',
        resources: { cpu: 0.5, memory: '256Mi' },
      },
    ],
  },

  async generateSDL(config: TemplateConfig): Promise<SDLOutput> {
    // Custom SDL generation logic
  },
};
```

### Custom Adapters

```typescript
// my-adapter.ts
import { World, Task, TaskResult } from '@morpheus/adapters';

export class MyCustomWorld implements World {
  async startRun(workflowId: string, input: unknown): Promise<string> {
    // Custom implementation
  }

  async executeTask<T>(runId: string, stepId: string, task: Task<T>): Promise<TaskResult<T>> {
    // Custom implementation
  }

  // ... other methods
}
```
