# Morpheus Deploy - Implementation Plan

## Overview

Build the "Deploy on Morpheus" API and frontend, enabling one-click decentralized deployments similar to "Deploy on Vercel".

**Documentation:** See [docs/API.md](./docs/API.md) for full API specification.

---

## Phase 1: API Foundation

### 1.1 Create `apps/api/` Package

- [ ] Initialize Hono server with TypeScript
- [ ] Set up project structure (routes, middleware, services, lib)
- [ ] Configure tsup build
- [ ] Add to turborepo workspace
- [ ] Set up environment configuration

### 1.2 Core Middleware

- [ ] CORS middleware
- [ ] Request logging middleware
- [ ] Error handling middleware
- [ ] Rate limiting middleware (in-memory for dev, Redis for prod)

### 1.3 Health & Base Routes

- [ ] `GET /health` - Health check endpoint
- [ ] `GET /api/info` - API version and status

---

## Phase 2: Authentication System

### 2.1 Smart Wallet (SIWE) Authentication

- [ ] `GET /api/auth/nonce` - Generate nonce for SIWE
- [ ] `POST /api/auth/verify` - Verify wallet signature
- [ ] JWT session token generation
- [ ] Session validation middleware

### 2.2 API Key Authentication

- [ ] API key format: `mor_sk_{random}`
- [ ] `POST /api/keys` - Create API key (requires wallet auth)
- [ ] `GET /api/keys` - List API keys
- [ ] `DELETE /api/keys/:id` - Revoke API key
- [ ] API key validation middleware
- [ ] Rate limiting per API key

### 2.3 GitHub OAuth

- [ ] `GET /api/auth/github` - Initiate OAuth flow
- [ ] `GET /api/auth/github/callback` - Handle callback
- [ ] GitHub token storage and refresh
- [ ] Combined auth middleware (supports all 3 methods)

---

## Phase 3: Database Layer

### 3.1 Database Setup (PostgreSQL + Drizzle)

- [ ] Set up Drizzle ORM
- [ ] Configure connection (Supabase for prod)
- [ ] Create migration system

### 3.2 Schema Design

- [ ] `users` table (wallet address, github id)
- [ ] `api_keys` table (hashed keys, permissions, rate limits)
- [ ] `deployments` table (dseq, status, config, urls)
- [ ] `webhooks` table (github webhook configs)
- [ ] `sessions` table (JWT sessions, refresh tokens)

### 3.3 Data Access Layer

- [ ] User service (CRUD operations)
- [ ] API key service (create, validate, revoke)
- [ ] Deployment service (tracking, status updates)
- [ ] Webhook service (registration, verification)

---

## Phase 4: Deployment API

### 4.1 Core Deployment Routes

- [ ] `POST /api/deploy` - Trigger deployment
- [ ] `POST /api/deploy/preview` - Get cost estimate
- [ ] `GET /api/deployments` - List user deployments
- [ ] `GET /api/deployments/:dseq` - Get deployment status
- [ ] `DELETE /api/deployments/:dseq` - Close deployment
- [ ] `POST /api/deployments/:dseq/fund` - Top up escrow

### 4.2 Deployment Orchestrator Service

- [ ] Integrate with `@morpheus-deploy/core`
- [ ] Repository cloning (via GitHub API or git)
- [ ] Framework detection
- [ ] Docker build orchestration
- [ ] SDL synthesis
- [ ] Akash deployment lifecycle

### 4.3 Funding Integration

- [ ] Integrate with `EconomicEngine` for swaps
- [ ] USDC -> AKT swap execution
- [ ] Escrow deposit automation
- [ ] Balance checking

---

## Phase 5: GitHub Integration

### 5.1 GitHub Service

- [ ] Repository listing
- [ ] Repository details fetching
- [ ] Branch listing
- [ ] Commit info
- [ ] File content access (for morpheus.yaml detection)

### 5.2 Webhook Handler

- [ ] `POST /api/webhooks/github` - Receive webhooks
- [ ] Signature verification
- [ ] Push event handling (auto-deploy)
- [ ] Pull request event handling (preview deploys)
- [ ] Webhook registration via API

### 5.3 Repository Analysis

- [ ] Auto-detect framework (Next.js, Node, Python, etc.)
- [ ] Suggest optimal template
- [ ] Parse existing morpheus.yaml
- [ ] Environment variable detection

---

## Phase 6: Deploy Button

### 6.1 Button Generation

- [ ] `GET /api/button` - Generate SVG badge
- [ ] Multiple styles (flat, for-the-badge, etc.)
- [ ] Custom colors and text

### 6.2 Button Redirect

- [ ] `GET /api/button/redirect` - Handle button clicks
- [ ] Pre-fill deploy page with repo info

### 6.3 Embed Code Generation

- [ ] `GET /api/button/embed` - Get embed snippets
- [ ] Markdown format
- [ ] HTML format
- [ ] React component snippet

### 6.4 Deploy Page Config API

- [ ] `GET /api/button/config` - Fetch repo info for deploy page
- [ ] Cost estimates
- [ ] Suggested configuration

---

## Phase 7: Frontend (Deploy Landing Page)

### 7.1 Project Setup

- [ ] Create `apps/web/` with Next.js 14
- [ ] Configure Tailwind CSS
- [ ] Set up shadcn/ui
- [ ] Dark theme with teal accent (Vercel-inspired)

### 7.2 Landing Page

- [ ] Hero section with "Deploy on Morpheus" headline
- [ ] Feature highlights (decentralized, crypto-native, one-click)
- [ ] How it works section
- [ ] Pricing/cost information
- [ ] Footer with links

### 7.3 Deploy Page (`/deploy`)

- [ ] Repository URL input
- [ ] GitHub repo browser (when authenticated)
- [ ] Template selector
- [ ] Resource configuration
- [ ] Environment variables editor
- [ ] Cost preview
- [ ] Wallet connect button
- [ ] Deploy button

### 7.4 Dashboard (`/dashboard`)

- [ ] Deployment list
- [ ] Deployment details view
- [ ] Log viewer
- [ ] Escrow balance display
- [ ] Quick actions (fund, close, redeploy)

### 7.5 Settings (`/settings`)

- [ ] API keys management
- [ ] GitHub connection
- [ ] Webhook configuration
- [ ] Wallet management

### 7.6 Components

- [ ] `<WalletConnect />` - Smart wallet connection
- [ ] `<DeployButton />` - Embeddable button component
- [ ] `<DeploymentCard />` - Deployment status card
- [ ] `<LogViewer />` - Real-time log streaming
- [ ] `<ResourceSlider />` - CPU/Memory/GPU selection
- [ ] `<EnvEditor />` - Environment variables editor

---

## Phase 8: Testing & Documentation

### 8.1 API Tests

- [ ] Unit tests for services
- [ ] Integration tests for routes
- [ ] Auth flow tests
- [ ] Deployment flow tests

### 8.2 E2E Tests

- [ ] Full deployment flow (API key)
- [ ] Full deployment flow (wallet)
- [ ] GitHub OAuth flow
- [ ] Webhook delivery

### 8.3 Documentation

- [ ] API reference (OpenAPI/Swagger)
- [ ] SDK documentation
- [ ] Integration guides
- [ ] Troubleshooting guide

---

## Phase 9: Deployment

### 9.1 Initial Deployment (Vercel)

- [ ] Deploy frontend to Vercel
- [ ] Deploy API to Vercel Functions OR Railway
- [ ] Configure Supabase (PostgreSQL)
- [ ] Set up environment variables
- [ ] Configure custom domain

### 9.2 Monitoring & Observability

- [ ] Error tracking (Sentry)
- [ ] Analytics (Plausible/PostHog)
- [ ] Uptime monitoring
- [ ] API metrics

---

## Phase 10: Future - Deploy API on Akash (Dogfooding)

> **Placeholder for future implementation**

### 10.1 Self-Hosting Preparation

- [ ] Create `morpheus-api.yaml` SDL
- [ ] Configure persistent storage for PostgreSQL
- [ ] Set up sealed secrets for production
- [ ] Health check and monitoring setup

### 10.2 Migration Plan

- [ ] Database migration strategy
- [ ] DNS cutover plan
- [ ] Rollback procedure
- [ ] Load testing on Akash

### 10.3 Documentation

- [ ] Self-hosting guide
- [ ] Custom deployment options
- [ ] Multi-region deployment

---

## File Structure

```
morpheus-deploy/
├── apps/
│   ├── cli/                    # Existing CLI
│   ├── api/                    # NEW: Hono API server
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── deploy.ts
│   │   │   │   ├── keys.ts
│   │   │   │   ├── button.ts
│   │   │   │   ├── webhook.ts
│   │   │   │   └── health.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── cors.ts
│   │   │   │   ├── rate-limit.ts
│   │   │   │   └── logging.ts
│   │   │   ├── services/
│   │   │   │   ├── deployment.ts
│   │   │   │   ├── github.ts
│   │   │   │   ├── api-keys.ts
│   │   │   │   └── wallet-session.ts
│   │   │   ├── db/
│   │   │   │   ├── schema.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── migrations/
│   │   │   └── lib/
│   │   │       ├── config.ts
│   │   │       ├── errors.ts
│   │   │       └── types.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                    # NEW: Next.js frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx           # Landing page
│       │   │   ├── deploy/
│       │   │   │   └── page.tsx       # Deploy page
│       │   │   ├── dashboard/
│       │   │   │   └── page.tsx       # Dashboard
│       │   │   └── settings/
│       │   │       └── page.tsx       # Settings
│       │   ├── components/
│       │   │   ├── ui/                # shadcn components
│       │   │   ├── wallet-connect.tsx
│       │   │   ├── deploy-button.tsx
│       │   │   ├── deployment-card.tsx
│       │   │   └── log-viewer.tsx
│       │   └── lib/
│       │       ├── api.ts
│       │       └── wallet.ts
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── core/                   # Existing
│   ├── contracts/              # Existing
│   ├── templates/              # Existing
│   └── adapters/               # Existing
└── docs/
    └── API.md                  # API documentation
```

---

## Dependencies

### apps/api

```json
{
  "dependencies": {
    "hono": "^4.0.0",
    "@hono/node-server": "^1.8.0",
    "drizzle-orm": "^0.30.0",
    "postgres": "^3.4.0",
    "siwe": "^2.1.0",
    "viem": "^2.0.0",
    "jose": "^5.2.0",
    "@octokit/rest": "^20.0.0",
    "zod": "^3.22.0",
    "@morpheus-deploy/core": "workspace:*",
    "@morpheus-deploy/contracts": "workspace:*",
    "@morpheus-deploy/templates": "workspace:*"
  }
}
```

### apps/web

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-*": "latest",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "wagmi": "^2.0.0",
    "@tanstack/react-query": "^5.0.0",
    "connectkit": "^1.5.0"
  }
}
```

---

## Timeline

| Week   | Phase | Focus                             |
| ------ | ----- | --------------------------------- |
| 1      | 1-2   | API foundation, auth system       |
| 2      | 3-4   | Database, deployment routes       |
| 3      | 5-6   | GitHub integration, deploy button |
| 4      | 7     | Frontend (landing, deploy page)   |
| 5      | 7-8   | Frontend (dashboard), testing     |
| 6      | 9     | Deployment, monitoring            |
| Future | 10    | Self-host on Akash                |

---

## Current Status

**Last Updated:** January 5, 2026

- [x] Documentation created (docs/API.md)
- [x] Implementation plan created (TODO.md)
- [x] Phase 1: API Foundation - **COMPLETED**
- [x] Phase 2: Authentication System - **COMPLETED**
- [x] Phase 3: Database Layer - **COMPLETED**
- [x] Phase 4: Deployment API - **COMPLETED**
- [x] Phase 5: GitHub Integration - **COMPLETED**
- [x] Phase 6: Deploy Button - **COMPLETED**
- [x] Phase 7: Frontend (Landing, Deploy, Dashboard, Settings) - **COMPLETED**
- [x] Phase 8: Testing (23 tests passing) - **COMPLETED**
- [ ] Phase 9: Deployment to Vercel/Railway - **PENDING**
- [ ] Phase 10: Self-host on Akash - **FUTURE**

## Completed Pages

- `/` - Landing page with hero, features, pricing
- `/deploy` - 4-step deploy wizard
- `/dashboard` - Deployment list with stats, filters, actions
- `/settings` - API keys, GitHub, Wallet, Notifications tabs

## API Tests (23 passing)

- `tests/health.test.ts` - Health endpoints (2 tests)
- `tests/auth.test.ts` - Auth/SIWE/GitHub (6 tests)
- `tests/keys.test.ts` - API key management (5 tests)
- `tests/button.test.ts` - Deploy button/embed (10 tests)

## Next Steps

1. Run `pnpm install` to install all dependencies
2. Copy `.env.example` to `.env` in apps/api
3. Run `pnpm dev` to start development servers
4. Test the API at http://localhost:3001
5. Test the frontend at http://localhost:3000
6. Deploy frontend to Vercel
7. Deploy API to Railway or Vercel Functions
8. Set up Supabase for PostgreSQL
