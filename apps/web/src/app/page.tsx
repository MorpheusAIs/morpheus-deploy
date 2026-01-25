'use client';
import {
  Wallet,
  Github,
  Cloud,
  Shield,
  Cpu,
  Activity,
  RefreshCw,
  ArrowRight,
  Terminal,
} from 'lucide-react';
import Link from 'next/link';

import { HeroVideo } from '@/components/hero-video';

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
                href="#features"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                How it Works
              </Link>
              <Link
                href="#pricing"
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
              <Link
                href="/whitepaper"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
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

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      <div className="absolute inset-0 grid-pattern" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-4 py-1.5 text-sm text-teal-400 mb-8">
          <Terminal className="h-3.5 w-3.5" />
          v1.0.0 Now Available on Base Sepolia
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Deploy to{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600">
            Decentralized
          </span>
          <br />
          Infrastructure
        </h1>

        <p className="mx-auto max-w-2xl text-lg sm:text-xl text-muted-foreground mb-10">
          One-click deployments for AI agents, MCP servers, and web apps. Pay with crypto, deploy on
          sovereign compute.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/deploy"
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-8 py-4 text-lg font-medium text-white shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 transition-all hover:scale-105"
          >
            <Terminal className="h-5 w-5" />
            Deploy Now
          </Link>
          <Link
            href="https://github.com/morpheusais/morpheus-deploy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/50 px-8 py-4 text-lg font-medium hover:bg-card transition-colors"
          >
            <Github className="h-5 w-5" />
            View on GitHub
          </Link>
        </div>

        <HeroVideo />
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      title: 'Connect Wallet',
      description:
        'Use your Smart Wallet with passkey authentication. No seed phrases, no private keys to manage.',
      icon: Wallet,
    },
    {
      step: '02',
      title: 'Import from GitHub',
      description:
        'Connect your repository or paste a URL. We auto-detect your framework and configure everything.',
      icon: Github,
    },
    {
      step: '03',
      title: 'Deploy to Akash',
      description:
        'One click to deploy. We handle USDC to AKT swaps, provider selection, and escrow management.',
      icon: Cloud,
    },
  ];

  return (
    <section id="how-it-works" className="py-24 sm:py-32 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Deploy in <span className="text-teal-500">Three Steps</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From code to running container in under 2 minutes
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((item, index) => (
            <div key={item.step} className="relative group">
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-1/2 w-full h-px bg-gradient-to-r from-teal-500/50 to-transparent" />
              )}
              <div className="relative bg-card/50 border border-border/50 rounded-2xl p-8 hover:border-teal-500/50 transition-colors hover:shadow-xl hover:shadow-teal-500/5">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-500/10 text-teal-500 mb-6">
                  <item.icon className="h-6 w-6" />
                </div>
                <div className="text-sm font-medium text-teal-500 mb-2">{item.step}</div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: Terminal,
      title: 'One-Command Deploy',
      description:
        'From code to running container with a single command. No Kubernetes manifests required.',
    },
    {
      icon: Wallet,
      title: 'Crypto-Native Funding',
      description: 'Pay with USDC on Base. We handle the swap to AKT automatically via Skip Go.',
    },
    {
      icon: Cpu,
      title: 'GPU Support',
      description:
        'Deploy AI models with RTX 4090, A100, and H100 GPUs at a fraction of cloud prices.',
    },
    {
      icon: Activity,
      title: 'Real-Time Logs',
      description: 'WebSocket-based log streaming. Monitor your deployments in real-time.',
    },
    {
      icon: RefreshCw,
      title: 'Auto Top-Up',
      description: 'Gas Station monitors your escrow and automatically refills when low.',
    },
    {
      icon: Shield,
      title: 'Smart Wallet Identity',
      description: 'Passkey authentication, no seed phrases. Your biometric IS your wallet.',
    },
  ];

  return (
    <section id="features" className="py-24 sm:py-32 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything You Need to <span className="text-teal-500">Ship Fast</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            The developer experience of Vercel, the sovereignty of decentralized compute
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative bg-background border border-border/50 rounded-2xl p-6 hover:border-teal-500/50 transition-all hover:shadow-xl hover:shadow-teal-500/5"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-teal-500/10 text-teal-500 mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProvidersSection() {
  const providers = [
    {
      name: 'Akash Network',
      description: 'Decentralized cloud compute marketplace',
      status: 'available',
    },
    {
      name: 'Flux',
      description: 'Decentralized Web3 cloud infrastructure',
      status: 'coming-soon',
    },
    {
      name: 'Dfinity ICP',
      description: 'Internet Computer blockchain platform',
      status: 'coming-soon',
    },
    {
      name: 'Filecoin',
      description: 'Decentralized storage network',
      status: 'coming-soon',
    },
  ];

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Deploy to multiple decentralized providers
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choose the provider that best fits your needs, or deploy to multiple providers for
            maximum resilience.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {providers.map((provider) => (
            <div
              key={provider.name}
              className="bg-card border border-border/50 rounded-2xl p-6 hover:border-teal-500/50 transition-all hover:shadow-xl hover:shadow-teal-500/5"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{provider.name}</h3>
                  <p className="text-muted-foreground text-sm">{provider.description}</p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    provider.status === 'available'
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                      : 'bg-muted text-muted-foreground border border-border'
                  }`}
                >
                  {provider.status === 'available' ? 'Available' : 'Coming Soon'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const comparisons = [
    { resource: '2 vCPU, 4GB RAM', cloud: '$60/mo', morpheus: '$25/mo' },
    { resource: 'RTX 4090 GPU', cloud: '$1.50/hr', morpheus: '$0.50/hr' },
    { resource: 'A100 GPU', cloud: '$4.00/hr', morpheus: '$1.50/hr' },
    { resource: '100GB SSD', cloud: '$10/mo', morpheus: '$3/mo' },
  ];

  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            <span className="text-teal-500">70% Cheaper</span> Than Cloud
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Decentralized compute is more efficient. Pay only for what you use.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 border-b border-border text-sm font-medium">
              <div>Resource</div>
              <div className="text-center">Traditional Cloud</div>
              <div className="text-center text-teal-500">Morpheus</div>
            </div>
            {comparisons.map((item, index) => (
              <div
                key={item.resource}
                className={`grid grid-cols-3 gap-4 p-4 ${index !== comparisons.length - 1 ? 'border-b border-border/50' : ''}`}
              >
                <div className="font-medium">{item.resource}</div>
                <div className="text-center text-muted-foreground line-through">{item.cloud}</div>
                <div className="text-center text-teal-500 font-semibold">{item.morpheus}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-muted-foreground text-sm mb-6">
              Pay with USDC. No credit cards, no invoices, no KYC.
            </p>
            <Link
              href="/deploy"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-8 py-4 text-lg font-medium text-white shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 transition-all hover:scale-105"
            >
              Start Deploying
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
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
            <Link
              href="https://discord.gg/kyVaxTHnvB"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Discord
            </Link>
            <Link
              href="https://x.com/morpheusais"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              X
            </Link>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground pt-8 border-t border-border/50">
          © 2025 by Morpheus. Open source infrastructure for Agentic AI.
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <ProvidersSection />
      <PricingSection />
      <Footer />
    </main>
  );
}
