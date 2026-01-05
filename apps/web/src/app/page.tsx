'use client';

import Link from 'next/link';
import {
  Rocket,
  Wallet,
  Github,
  Cloud,
  Zap,
  Shield,
  Cpu,
  Activity,
  RefreshCw,
  ArrowRight,
  Terminal,
  Globe,
} from 'lucide-react';

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                <Rocket className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold">Morpheus</span>
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
          <Zap className="h-3.5 w-3.5" />
          Powered by Akash Network
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
            Deploy Now
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/50 px-8 py-4 text-lg font-medium hover:bg-card transition-colors"
          >
            <Terminal className="h-5 w-5" />
            View Docs
          </Link>
        </div>

        <div className="mt-16 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm p-1 shadow-2xl max-w-3xl mx-auto">
          <div className="rounded-lg bg-[#0d1117] p-4 font-mono text-sm text-left overflow-x-auto">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <div className="h-3 w-3 rounded-full bg-red-500/80" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <div className="h-3 w-3 rounded-full bg-green-500/80" />
            </div>
            <code className="text-teal-400">$</code>
            <code className="text-white"> npx morpheus-deploy init</code>
            <br />
            <code className="text-muted-foreground">Creating morpheus.yaml...</code>
            <br />
            <code className="text-teal-400">$</code>
            <code className="text-white"> npx morpheus-deploy deploy</code>
            <br />
            <code className="text-green-400">Deployed to https://abc123.akash.network</code>
          </div>
        </div>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/deploy" className="hover:text-foreground transition-colors">
                  Deploy
                </Link>
              </li>
              <li>
                <Link href="#features" className="hover:text-foreground transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/docs" className="hover:text-foreground transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/docs/api" className="hover:text-foreground transition-colors">
                  API Reference
                </Link>
              </li>
              <li>
                <Link href="/docs/templates" className="hover:text-foreground transition-colors">
                  Templates
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-foreground transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="https://github.com/morpheus-deploy"
                  className="hover:text-foreground transition-colors"
                >
                  GitHub
                </Link>
              </li>
              <li>
                <Link
                  href="https://twitter.com/morpheusdeploy"
                  className="hover:text-foreground transition-colors"
                >
                  Twitter
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-border/50">
          <div className="flex items-center gap-2 mb-4 sm:mb-0">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
              <Rocket className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold">Morpheus Deploy</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span>Powered by Akash Network</span>
          </div>
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
      <PricingSection />
      <Footer />
    </main>
  );
}
