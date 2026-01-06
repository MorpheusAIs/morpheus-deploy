'use client';

import {
  Terminal,
  Wallet,
  Github,
  ArrowLeft,
  Cpu,
  Database,
  Layers,
  Zap,
  Shield,
  Globe,
  Code,
  Server,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <Terminal className="h-6 w-6 text-teal-500" />
              <span className="text-lg font-semibold text-white">morpheus deploy</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/#features"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </Link>
              <Link
                href="/#how-it-works"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                How it Works
              </Link>
              <Link
                href="/#pricing"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/docs"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Docs
              </Link>
              <Link href="/whitepaper" className="text-sm text-teal-500 font-medium">
                Whitepaper
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/deploy"
              className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transition-all hover:scale-105"
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function TableOfContents() {
  const sections = [
    { id: 'abstract', title: 'Abstract' },
    { id: 'introduction', title: '1. Introduction' },
    { id: 'architecture', title: '2. Technical Architecture' },
    { id: 'workflow', title: '3. Workflow Implementation' },
    { id: 'tokenomics', title: '4. Tokenomics & Governance' },
    { id: 'use-cases', title: '5. Use Cases' },
    { id: 'roadmap', title: '6. Roadmap' },
    { id: 'conclusion', title: '7. Conclusion' },
  ];

  return (
    <div className="hidden lg:block sticky top-24 w-64 shrink-0">
      <div className="border border-border/50 rounded-xl bg-card/50 p-6">
        <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
          Contents
        </h3>
        <nav className="space-y-2">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="block text-sm text-muted-foreground hover:text-teal-500 transition-colors py-1"
            >
              {section.title}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mb-16">
      {children}
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-white">{children}</h2>;
}

function SubsectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl font-semibold mb-4 text-white/90 mt-8">{children}</h3>;
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground leading-relaxed mb-4">{children}</p>;
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="my-6 rounded-xl border border-border/50 bg-card/80 overflow-hidden">
      {title && (
        <div className="px-4 py-2 border-b border-border/50 bg-muted/30">
          <span className="text-xs font-mono text-muted-foreground">{title}</span>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm">
        <code className="text-teal-400 font-mono">{children}</code>
      </pre>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card/50 border border-border/50 rounded-xl p-6 hover:border-teal-500/30 transition-colors">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-teal-500/10 text-teal-500 mb-4">
        <Icon className="h-5 w-5" />
      </div>
      <h4 className="font-semibold mb-2 text-white">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function DiagramBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-8 p-6 rounded-xl border border-border/50 bg-card/30 font-mono text-sm overflow-x-auto">
      <pre className="text-muted-foreground whitespace-pre">{children}</pre>
    </div>
  );
}

function StatusBadge({ status }: { status: 'complete' | 'in-progress' | 'planned' }) {
  const styles = {
    complete: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    'in-progress': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    planned: 'bg-muted text-muted-foreground border-border',
  };

  const labels = {
    complete: 'Complete',
    'in-progress': 'In Progress',
    planned: 'Planned',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function WhitepaperPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <div className="relative pt-24 pb-16 border-b border-border/50">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-teal-500 transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-4 py-1.5 text-sm text-teal-400 mb-6">
              <Code className="h-3.5 w-3.5" />
              White Paper v1.1
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
              Morpheus:{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-teal-600">
                Decentralized Orchestration
              </span>
              <br />
              for the Agentic Web
            </h1>

            <p className="text-xl text-muted-foreground">
              Infrastructure as code for the agentic era. A CLI tool that brings Vercel-like
              deployment simplicity to decentralized infrastructure.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex gap-16">
          <TableOfContents />

          <div className="flex-1 max-w-3xl">
            {/* Abstract */}
            <Section id="abstract">
              <SectionTitle>Abstract</SectionTitle>
              <div className="bg-gradient-to-r from-teal-500/10 to-transparent border-l-2 border-teal-500 pl-6 py-4 mb-6">
                <p className="text-lg text-white/90 italic">
                  Morpheus is an emancipation protocol for Artificial Intelligence. Morpheus-deploy
                  is infrastructure as code for the agentic era—a CLI tool that brings Vercel-like
                  deployment simplicity to decentralized infrastructure, starting with Akash
                  Network.
                </p>
              </div>

              <Paragraph>
                The transition from Generative AI (chatbots) to Agentic AI (autonomous workflows)
                requires a fundamental shift in infrastructure. While modern frameworks have
                standardized the logic of agents, the deployment of these agents remains tethered to
                centralized, censorship-prone, and costly cloud providers.
              </Paragraph>

              <Paragraph>
                Morpheus bridges this gap by abstracting the complexities of Decentralized Physical
                Infrastructure Networks (DePIN). It enables developers to deploy durable,
                agent-based workflows to networks like Akash with a single command. The protocol
                introduces an Atomic Swap Liquidity Layer, enabling developers to fund
                infrastructure using stablecoins (USDC), which are automatically swapped for the
                requisite DePIN utility tokens (AKT) in real-time.
              </Paragraph>
            </Section>

            {/* Introduction */}
            <Section id="introduction">
              <SectionTitle>1. Introduction</SectionTitle>

              <SubsectionTitle>1.1 The Problem: The Cloud Bottleneck</SubsectionTitle>
              <Paragraph>
                The current AI development stack is bifurcated. Developers enjoy high-level
                abstractions for building agents, but deployment options are restrictive. Running
                long-running, "human-in-the-loop" agents on centralized serverless platforms leads
                to timeouts, high costs per compute unit, and platform lock-in.
              </Paragraph>

              <Paragraph>
                Conversely, Decentralized Infrastructure (DePIN) offers compute at 70-80% lower
                costs and censorship resistance. However, the UX barrier is insurmountable for most
                developers:
              </Paragraph>

              <div className="grid sm:grid-cols-3 gap-4 my-6">
                <FeatureCard
                  icon={Wallet}
                  title="Fragmented Liquidity"
                  description="Managing multiple wallets and tokens (AKT, FIL, RNDR, HONEY)"
                />
                <FeatureCard
                  icon={Code}
                  title="Complex Configuration"
                  description="Writing provider-specific manifests (SDLs) rather than standard Docker containers"
                />
                <FeatureCard
                  icon={Terminal}
                  title="Lack of Tooling"
                  description='No "Vercel-like" experience for the decentralized web'
                />
              </div>

              <SubsectionTitle>1.2 The Morpheus Solution</SubsectionTitle>
              <Paragraph>
                Morpheus is the "connective tissue" between the AI Application Layer and the DePIN
                Layer. It functions not as a competitor to these networks, but as an aggregator and
                orchestrator.
              </Paragraph>

              <div className="bg-card/50 border border-border/50 rounded-xl p-6 my-6">
                <h4 className="font-semibold mb-4 text-white">Core Value Proposition</h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-500/20 text-teal-500 flex items-center justify-center text-sm font-medium">
                      1
                    </span>
                    <span className="text-muted-foreground">
                      <strong className="text-white">Write Once, Run Anywhere:</strong> Build with
                      standard tools; deploy to any supported DePIN provider.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-500/20 text-teal-500 flex items-center justify-center text-sm font-medium">
                      2
                    </span>
                    <span className="text-muted-foreground">
                      <strong className="text-white">Abstracted Economics:</strong> Pay in
                      stablecoins (USDC); Morpheus handles the cross-chain swaps and provider
                      payments.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-500/20 text-teal-500 flex items-center justify-center text-sm font-medium">
                      3
                    </span>
                    <span className="text-muted-foreground">
                      <strong className="text-white">Sovereign Runtime:</strong> Agents run in
                      isolated, cryptographically verifiable containers, free from centralized
                      gatekeepers.
                    </span>
                  </li>
                </ul>
              </div>
            </Section>

            {/* Architecture */}
            <Section id="architecture">
              <SectionTitle>2. Technical Architecture</SectionTitle>
              <Paragraph>
                The Morpheus architecture consists of three primary components: the Client Interface
                (CLI), the Deployment Abstraction Layer, and the Financial Engine.
              </Paragraph>

              <SubsectionTitle>2.1 The Morpheus CLI</SubsectionTitle>
              <Paragraph>
                The entry point for developers is a Node.js-based command-line interface designed to
                mirror familiar workflows.
              </Paragraph>

              <ul className="space-y-4 my-6">
                <li className="flex items-start gap-3">
                  <Terminal className="h-5 w-5 text-teal-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-white">Initialization:</strong>
                    <span className="text-muted-foreground">
                      {' '}
                      <code className="text-teal-400">morpheus init</code> scaffolds a project with
                      framework detection, generating a{' '}
                      <code className="text-teal-400">morpheus.yaml</code> config file.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Database className="h-5 w-5 text-teal-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-white">Durable Execution:</strong>
                    <span className="text-muted-foreground">
                      {' '}
                      Morpheus injects a PostgreSQL sidecar that persists workflow state. If a
                      container restarts, agents resume from the last completed step. This
                      implementation is compatible with the Workflow SDK's World abstraction
                      pattern.
                    </span>
                  </div>
                </li>
              </ul>

              <SubsectionTitle>2.2 Deployment Abstraction Layer</SubsectionTitle>
              <Paragraph>
                Morpheus treats DePIN providers as pluggable backends. The core logic handles the
                translation of application code into infrastructure manifests.
              </Paragraph>

              <div className="grid sm:grid-cols-2 gap-4 my-6">
                <FeatureCard
                  icon={Layers}
                  title="Containerization"
                  description="Builds standardized OCI (Docker) containers with Node.js runtime, Agent code, and MCP servers"
                />
                <FeatureCard
                  icon={Server}
                  title="Manifest Compilation"
                  description="Transforms morpheus.yaml into provider-specific configs (Akash SDL)"
                />
              </div>

              <Paragraph>
                <strong className="text-white">Currently Supported:</strong>
              </Paragraph>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-400 text-sm border border-teal-500/30">
                  Akash Network
                </span>
              </div>

              <Paragraph>
                <strong className="text-white">Planned Providers:</strong>
              </Paragraph>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm border border-border">
                  Flux
                </span>
                <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm border border-border">
                  Dfinity ICP
                </span>
                <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm border border-border">
                  Filecoin
                </span>
              </div>

              <SubsectionTitle>2.3 The Financial Engine (Auto-Swap Module)</SubsectionTitle>
              <Paragraph>
                This is a critical innovation of Morpheus. To remove the friction of holding
                volatile utility tokens, Morpheus integrates a wallet module capable of atomic swaps
                via Skip Go.
              </Paragraph>

              <div className="bg-card/50 border border-border/50 rounded-xl p-6 my-6">
                <h4 className="font-semibold mb-4 text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-teal-500" />
                  The Payment Flow
                </h4>
                <ol className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    <span className="text-muted-foreground">
                      <strong className="text-white">Estimation:</strong> The CLI queries the Akash
                      marketplace for current lease costs
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    <span className="text-muted-foreground">
                      <strong className="text-white">Quote:</strong> Skip Go API provides real-time
                      AKT/USDC pricing
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold">
                      3
                    </span>
                    <span className="text-muted-foreground">
                      <strong className="text-white">Swap:</strong> Cross-chain swap executes USDC
                      (Base) → AKT (Akash) via IBC
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold">
                      4
                    </span>
                    <span className="text-muted-foreground">
                      <strong className="text-white">Lease Funding:</strong> AKT deposited into
                      Akash escrow to secure compute lease
                    </span>
                  </li>
                </ol>
              </div>

              <SubsectionTitle>2.4 Smart Wallet Integration</SubsectionTitle>
              <Paragraph>
                Morpheus creates ERC-4337 Smart Wallets using the Coinbase Smart Wallet Factory.
                While the system generates an owner key that must be securely stored, the
                architecture supports passkey-based authentication for enhanced UX.
              </Paragraph>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 my-6">
                <p className="text-sm text-yellow-400">
                  <strong>Note:</strong> The owner private key is returned to the caller and must be
                  securely stored. We recommend integrating with hardware wallets or passkey
                  providers for production deployments.
                </p>
              </div>
            </Section>

            {/* Workflow */}
            <Section id="workflow">
              <SectionTitle>3. Workflow Implementation</SectionTitle>
              <Paragraph>
                The Morpheus workflow is designed for maximum developer velocity.
              </Paragraph>

              <SubsectionTitle>Step 1: Configuration</SubsectionTitle>
              <Paragraph>
                Define your deployment target in{' '}
                <code className="text-teal-400">morpheus.yaml</code>:
              </Paragraph>

              <CodeBlock title="morpheus.yaml">
                {`project: my-finance-agent
template: ai-agent
provider: akash
network: testnet

funding:
  sourceToken: USDC
  autoTopUp: true
  threshold: 0.1
  split:
    staking: 0.6
    compute: 0.4

resources:
  cpu: 2
  memory: 4Gi
  storage: 10Gi
  gpu:
    model: nvidia-rtx4090
    units: 1

env:
  variables:
    NODE_ENV: production
  secrets:
    - ANTHROPIC_API_KEY`}
              </CodeBlock>

              <SubsectionTitle>Step 2: Deployment</SubsectionTitle>
              <Paragraph>
                Run <code className="text-teal-400">morpheus deploy</code> to execute the full
                deployment pipeline:
              </Paragraph>

              <DiagramBox>
                {`Build Docker Image
       │
       ▼
Push to Registry
       │
       ▼
Synthesize Akash SDL ─────────────┐
       │                          │
       ▼                          │
Execute USDC → AKT Swap     PostgreSQL Sidecar
       │                     Vector Logging
       ▼                          │
Broadcast to Akash ◄──────────────┘
       │
       ▼
Wait for Provider Bids
       │
       ▼
Create Lease
       │
       ▼
Send Manifest
       │
       ▼
✓ Live at provider-uri.akash.pub`}
              </DiagramBox>

              <SubsectionTitle>Step 3: Result</SubsectionTitle>
              <Paragraph>
                Your agent receives a decentralized endpoint with full durability support. The
                included sidecars provide:
              </Paragraph>

              <div className="grid sm:grid-cols-2 gap-4 my-6">
                <div className="bg-card/50 border border-border/50 rounded-xl p-4">
                  <Database className="h-5 w-5 text-teal-500 mb-2" />
                  <h4 className="font-semibold text-white text-sm">PostgreSQL Sidecar</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Workflow state persistence compatible with @workflow/world-postgres patterns
                  </p>
                </div>
                <div className="bg-card/50 border border-border/50 rounded-xl p-4">
                  <Activity className="h-5 w-5 text-teal-500 mb-2" />
                  <h4 className="font-semibold text-white text-sm">Vector Log Shipper</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Real-time log streaming and aggregation
                  </p>
                </div>
              </div>
            </Section>

            {/* Tokenomics */}
            <Section id="tokenomics">
              <SectionTitle>4. Tokenomics & Governance</SectionTitle>
              <Paragraph>
                While Morpheus is infrastructure-agnostic, the protocol integrates with the MOR
                token ecosystem to incentivize sustainable infrastructure.
              </Paragraph>

              <div className="space-y-4 my-6">
                <div className="flex items-start gap-4 bg-card/50 border border-border/50 rounded-xl p-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Protocol Fees</h4>
                    <p className="text-sm text-muted-foreground">
                      A micro-fee (0.5%) on Auto-Swap volume is collected by the protocol treasury
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-card/50 border border-border/50 rounded-xl p-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Staking for Priority</h4>
                    <p className="text-sm text-muted-foreground">
                      Providers can stake MOR to be prioritized in the default provider list
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-card/50 border border-border/50 rounded-xl p-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Governance</h4>
                    <p className="text-sm text-muted-foreground">
                      Token holders vote on adding new DePIN adapters and managing treasury funds
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 my-6">
                <p className="text-sm text-yellow-400">
                  <strong>Current Status:</strong> MOR staking contracts are deployed on Base
                  Sepolia testnet. Mainnet deployment is pending final audits.
                </p>
              </div>
            </Section>

            {/* Use Cases */}
            <Section id="use-cases">
              <SectionTitle>5. Use Cases</SectionTitle>

              <div className="space-y-6">
                <div className="bg-card/50 border border-border/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">5.1 Durable AI Agents</h3>
                  <p className="text-muted-foreground mb-4">
                    Agents requiring long-running memory and persistent state can be deployed on
                    Akash with PostgreSQL sidecars. The World abstraction enables step-by-step
                    execution with automatic recovery on container restart.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-teal-500">
                    <Cpu className="h-4 w-4" />
                    GPU support for inference workloads
                  </div>
                </div>

                <div className="bg-card/50 border border-border/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">5.2 Secure MCP Servers</h3>
                  <p className="text-muted-foreground mb-4">
                    Enterprises can deploy Model Context Protocol servers that connect to internal
                    tools. Processing happens in containers you control, with sealed secrets for API
                    keys.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-teal-500">
                    <Shield className="h-4 w-4" />
                    ECIES encryption for environment variables
                  </div>
                </div>

                <div className="bg-card/50 border border-border/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    5.3 DAO-Managed Infrastructure
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    DAOs can fund wallets with USDC to automatically provision compute for
                    governance agents—treasury managers, Discord bots, or autonomous operators.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-teal-500">
                    <Wallet className="h-4 w-4" />
                    Auto top-up keeps services running
                  </div>
                </div>
              </div>
            </Section>

            {/* Roadmap */}
            <Section id="roadmap">
              <SectionTitle>6. Roadmap</SectionTitle>

              <div className="space-y-6">
                <div className="bg-card/50 border border-border/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Phase 1: Genesis</h3>
                    <StatusBadge status="complete" />
                  </div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      Morpheus CLI v1.0 (Node.js)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      Integration with Akash Network
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      PostgreSQL World adapter for durability
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      ERC-4337 Smart Wallet integration
                    </li>
                  </ul>
                </div>

                <div className="bg-card/50 border border-border/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Phase 2: Liquidity</h3>
                    <StatusBadge status="in-progress" />
                  </div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      Auto-Swap Engine via Skip Go
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      USDC funding support on Base
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                      MOR staking integration (testnet)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      Gas Station auto top-up
                    </li>
                  </ul>
                </div>

                <div className="bg-card/50 border border-border/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Phase 3: The Mesh</h3>
                    <StatusBadge status="planned" />
                  </div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      Multi-provider redundancy
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      Flux and ICP adapters
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      MOR mainnet staking
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      Threshold cryptography for secrets
                    </li>
                  </ul>
                </div>
              </div>
            </Section>

            {/* Conclusion */}
            <Section id="conclusion">
              <SectionTitle>7. Conclusion</SectionTitle>

              <div className="bg-gradient-to-r from-teal-500/10 to-transparent border-l-2 border-teal-500 pl-6 py-4 mb-6">
                <p className="text-lg text-white/90">
                  Morpheus is an emancipation protocol for Artificial Intelligence. By abstracting
                  the complexities of decentralized infrastructure and automating the economics of
                  resource allocation, Morpheus enables a future where AI agents are sovereign,
                  durable, and unstoppable.
                </p>
              </div>

              <Paragraph>
                Morpheus-deploy brings the ease of Web2 development to the power of Web3
                infrastructure. It's not just a deployment tool—it's the foundation for autonomous
                AI that operates without centralized permission.
              </Paragraph>

              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Link
                  href="/deploy"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-3 text-base font-medium text-white shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 transition-all hover:scale-105"
                >
                  <Terminal className="h-5 w-5" />
                  Start Deploying
                </Link>
                <Link
                  href="https://github.com/morpheusais/morpheus-deploy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/50 px-6 py-3 text-base font-medium hover:bg-card transition-colors"
                >
                  <Github className="h-5 w-5" />
                  View Source
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </Section>

            {/* Footer Links */}
            <div className="border-t border-border/50 pt-8 mt-16">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                References
              </h3>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <a
                  href="https://akash.network/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-teal-500 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Akash Network Documentation
                </a>
                <a
                  href="https://api.skip.money/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-teal-500 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Skip Go API
                </a>
                <a
                  href="https://www.smartwallet.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-teal-500 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Coinbase Smart Wallet
                </a>
                <a
                  href="https://mor.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-teal-500 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Morpheus Protocol
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 bg-card/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
            <Link href="/" className="flex items-center gap-2">
              <Terminal className="h-6 w-6 text-teal-500" />
              <span className="text-lg font-semibold text-white">morpheus deploy</span>
            </Link>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link
                href="https://mor.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                About Morpheus
              </Link>
              <Link href="/docs" className="hover:text-foreground transition-colors">
                Documentation
              </Link>
              <Link
                href="https://github.com/morpheusais/morpheus-deploy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </Link>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground pt-8 border-t border-border/50">
            © 2025 by Morpheus. Open source infrastructure for Agentic AI.
          </div>
        </div>
      </footer>
    </main>
  );
}

function Activity({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
