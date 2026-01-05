# Morpheus Deploy API

**"Deploy on Morpheus" - One-Click Decentralized Deployments**

This document describes the HTTP API that powers the "Deploy on Morpheus" button and programmatic deployment capabilities.

## Overview

The Morpheus API enables three deployment modes:

1. **Deploy Button** - Embeddable button for GitHub READMEs (like "Deploy on Vercel")
2. **Programmatic API** - API key authenticated endpoints for AI agents and automation
3. **Interactive Deployments** - Smart Wallet authenticated browser-based deployments

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Morpheus Deployment Platform                        │
│                                                                                  │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐               │
│  │  Deploy Button  │   │   Frontend App  │   │   AI Agents     │               │
│  │  (Embeddable)   │   │   (v0-style)    │   │  (Programmatic) │               │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘               │
│           │                     │                     │                          │
│           │ Smart Wallet        │ GitHub OAuth        │ API Key                  │
│           │                     │                     │                          │
│           └─────────────────────┼─────────────────────┘                          │
│                                 │                                                │
│                        ┌────────▼────────┐                                       │
│                        │   Morpheus API  │                                       │
│                        │   (Hono + Edge) │                                       │
│                        └────────┬────────┘                                       │
│                                 │                                                │
│       ┌─────────────────────────┼─────────────────────────┐                     │
│       │                         │                         │                      │
│       ▼                         ▼                         ▼                      │
│ ┌───────────┐           ┌───────────┐           ┌───────────┐                   │
│ │  @morpheus │           │  @morpheus │           │  @morpheus │                   │
│ │   /core   │           │ /contracts │           │ /templates │                   │
│ └───────────┘           └───────────┘           └───────────┘                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │        Akash Network          │
                    │    (Decentralized Compute)    │
                    └───────────────────────────────┘
```

## Authentication

### API Key Authentication (Programmatic)

For AI agents and automation scripts:

```bash
curl -X POST https://api.morpheus.network/api/deploy \
  -H "Authorization: Bearer mor_sk_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "github.com/user/my-agent",
    "template": "ai-agent"
  }'
```

**API Key Format:** `mor_sk_{32-character-random-string}`

**Rate Limits:**

- 10 deployments per day
- 100 API requests per minute
- Configurable per key

### Smart Wallet Authentication (Interactive)

For browser-based deployments using SIWE (Sign-In with Ethereum):

```typescript
// 1. Get nonce
const { nonce } = await fetch('/api/auth/nonce').then((r) => r.json());

// 2. Create and sign SIWE message
const message = createSIWEMessage(walletAddress, nonce);
const signature = await wallet.signMessage(message);

// 3. Verify and get session token
const { token } = await fetch('/api/auth/verify', {
  method: 'POST',
  body: JSON.stringify({ message, signature, address: walletAddress }),
}).then((r) => r.json());

// 4. Use token for subsequent requests
fetch('/api/deploy', {
  headers: { Authorization: `Bearer ${token}` },
  // ...
});
```

### GitHub OAuth (Repository Access)

For accessing private repositories:

```
GET /api/auth/github → Redirects to GitHub OAuth
GET /api/auth/github/callback → Handles OAuth callback
```

## API Endpoints

### Deployments

#### Create Deployment

```http
POST /api/deploy
Authorization: Bearer <token>
Content-Type: application/json

{
  "repoUrl": "github.com/user/repo",
  "branch": "main",
  "template": "ai-agent",
  "resources": {
    "cpu": 2,
    "memory": "4Gi",
    "gpu": { "model": "rtx4090", "count": 1 }
  },
  "env": {
    "MODEL": "claude-3-5-sonnet",
    "API_KEY": "sealed:v1:..."
  },
  "funding": {
    "initialDeposit": 50,
    "autoTopUp": true,
    "maxBudget": 100
  }
}
```

**Response:**

```json
{
  "deploymentId": "dep_abc123",
  "dseq": "12345678",
  "status": "pending",
  "estimatedTime": "2-3 minutes"
}
```

#### Get Deployment Preview

```http
POST /api/deploy/preview
Authorization: Bearer <token>
Content-Type: application/json

{
  "repoUrl": "github.com/user/repo",
  "template": "ai-agent",
  "resources": { "cpu": 2, "memory": "4Gi" }
}
```

**Response:**

```json
{
  "estimate": {
    "hourlyRate": 0.15,
    "dailyRate": 3.6,
    "monthlyRate": 108.0,
    "currency": "USD"
  },
  "resources": {
    "cpu": 2,
    "memory": "4Gi",
    "storage": "10Gi"
  },
  "suggestedTemplate": "ai-agent",
  "detectedFramework": "node"
}
```

#### List Deployments

```http
GET /api/deployments
Authorization: Bearer <token>
```

**Response:**

```json
{
  "deployments": [
    {
      "id": "dep_abc123",
      "dseq": "12345678",
      "repoUrl": "github.com/user/repo",
      "status": "active",
      "serviceUrl": "https://abc123.akash.network",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Get Deployment Status

```http
GET /api/deployments/:dseq
Authorization: Bearer <token>
```

**Response:**

```json
{
  "dseq": "12345678",
  "status": "active",
  "provider": "akash1provider...",
  "serviceUrl": "https://abc123.akash.network",
  "escrowBalance": {
    "amount": 45.5,
    "currency": "AKT",
    "usdValue": 150.0
  },
  "estimatedTimeRemaining": "5 days",
  "resources": {
    "cpu": 2,
    "memory": "4Gi",
    "gpu": { "model": "rtx4090", "count": 1 }
  },
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### Close Deployment

```http
DELETE /api/deployments/:dseq
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "refundedAmount": 25.0,
  "refundCurrency": "AKT"
}
```

#### Fund Deployment

```http
POST /api/deployments/:dseq/fund
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 25.00,
  "currency": "USDC"
}
```

**Response:**

```json
{
  "txHash": "0xabc123...",
  "swapDetails": {
    "sourceAmount": 25.0,
    "sourceCurrency": "USDC",
    "destinationAmount": 7.5,
    "destinationCurrency": "AKT"
  },
  "newBalance": {
    "amount": 53.0,
    "currency": "AKT"
  }
}
```

### API Keys

#### Create API Key

```http
POST /api/keys
Authorization: Bearer <wallet-session-token>
Content-Type: application/json

{
  "name": "My Agent Key",
  "permissions": ["deploy", "status", "logs"],
  "expiresAt": "2025-01-15T00:00:00Z"
}
```

**Response:**

```json
{
  "id": "key_abc123",
  "key": "mor_sk_a1b2c3d4e5f6...",
  "name": "My Agent Key",
  "permissions": ["deploy", "status", "logs"],
  "createdAt": "2024-01-15T10:30:00Z",
  "expiresAt": "2025-01-15T00:00:00Z"
}
```

> **Warning:** The full API key is only shown once. Store it securely.

#### List API Keys

```http
GET /api/keys
Authorization: Bearer <wallet-session-token>
```

**Response:**

```json
{
  "keys": [
    {
      "id": "key_abc123",
      "name": "My Agent Key",
      "prefix": "mor_sk_a1b2",
      "permissions": ["deploy", "status", "logs"],
      "lastUsedAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Revoke API Key

```http
DELETE /api/keys/:id
Authorization: Bearer <wallet-session-token>
```

### Deploy Button

#### Get Button SVG

```http
GET /api/button?repo=github.com/user/repo&template=ai-agent&style=flat
```

Returns an SVG image for embedding:

```markdown
[![Deploy on Morpheus](https://morpheus.network/api/button?repo=github.com/user/repo)](https://morpheus.network/deploy?repo=github.com/user/repo)
```

#### Button Redirect

```http
GET /api/button/redirect?repo=github.com/user/repo&template=ai-agent
```

Redirects to the deploy page with pre-filled parameters.

#### Get Embed Code

```http
GET /api/button/embed?repo=github.com/user/repo&format=markdown
```

**Response (Markdown):**

```
[![Deploy on Morpheus](https://morpheus.network/api/button?repo=github.com/user/repo)](https://morpheus.network/deploy?repo=github.com/user/repo)
```

**Response (HTML):**

```html
<a href="https://morpheus.network/deploy?repo=github.com/user/repo">
  <img
    src="https://morpheus.network/api/button?repo=github.com/user/repo"
    alt="Deploy on Morpheus"
  />
</a>
```

### Webhooks

#### GitHub Webhook

```http
POST /api/webhooks/github
X-Hub-Signature-256: sha256=...
X-GitHub-Event: push

{
  "ref": "refs/heads/main",
  "repository": { ... },
  "commits": [ ... ]
}
```

Automatically triggers deployments on push to configured branches.

### Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Error Handling

All errors follow this format:

```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Wallet balance too low for deployment",
    "details": {
      "required": 50.0,
      "available": 25.0,
      "currency": "USDC"
    }
  }
}
```

### Error Codes

| Code                 | HTTP Status | Description                       |
| -------------------- | ----------- | --------------------------------- |
| `UNAUTHORIZED`       | 401         | Invalid or missing authentication |
| `FORBIDDEN`          | 403         | Insufficient permissions          |
| `NOT_FOUND`          | 404         | Resource not found                |
| `RATE_LIMITED`       | 429         | Rate limit exceeded               |
| `INSUFFICIENT_FUNDS` | 402         | Wallet balance too low            |
| `INVALID_CONFIG`     | 400         | Invalid deployment configuration  |
| `DEPLOYMENT_FAILED`  | 500         | Deployment process failed         |
| `PROVIDER_ERROR`     | 502         | Akash provider error              |

## Rate Limits

| Tier       | Deployments/Day | Requests/Minute |
| ---------- | --------------- | --------------- |
| Free       | 10              | 100             |
| Pro        | 100             | 1000            |
| Enterprise | Unlimited       | Unlimited       |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312200
```

## SDK Usage

### JavaScript/TypeScript

```typescript
import { MorpheusClient } from '@morpheus-deploy/sdk';

const client = new MorpheusClient({
  apiKey: 'mor_sk_abc123...',
});

// Deploy
const deployment = await client.deploy({
  repoUrl: 'github.com/user/my-agent',
  template: 'ai-agent',
  resources: { cpu: 2, memory: '4Gi' },
});

console.log(`Deployed: ${deployment.serviceUrl}`);

// Check status
const status = await client.getDeployment(deployment.dseq);
console.log(`Status: ${status.status}`);

// Stream logs
const logs = client.streamLogs(deployment.dseq);
for await (const log of logs) {
  console.log(log.message);
}
```

### Python

```python
from morpheus_deploy import MorpheusClient

client = MorpheusClient(api_key="mor_sk_abc123...")

# Deploy
deployment = client.deploy(
    repo_url="github.com/user/my-agent",
    template="ai-agent",
    resources={"cpu": 2, "memory": "4Gi"}
)

print(f"Deployed: {deployment.service_url}")

# Check status
status = client.get_deployment(deployment.dseq)
print(f"Status: {status.status}")
```

## Webhooks

Configure automatic deployments on git push:

1. Go to your repository settings
2. Add webhook URL: `https://api.morpheus.network/api/webhooks/github`
3. Select events: `push`, `pull_request`
4. Add webhook secret (from Morpheus dashboard)

Or use the API to configure programmatically:

```typescript
await client.createWebhook({
  repoUrl: 'github.com/user/repo',
  events: ['push'],
  branch: 'main',
});
```

## Self-Hosting

The Morpheus API can be deployed on Akash Network itself:

```bash
# Deploy API to Akash
morpheus deploy --config morpheus-api.yaml
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment guides.
