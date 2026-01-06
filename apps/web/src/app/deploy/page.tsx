'use client';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cpu,
  ExternalLink,
  Github,
  HardDrive,
  Loader2,
  Rocket,
  Terminal,
  Wallet,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

type Step = 'connect' | 'repo' | 'config' | 'deploy';

interface DeployConfig {
  repoUrl: string;
  branch: string;
  template: 'ai-agent' | 'mcp-server' | 'website' | 'custom';
  cpu: number;
  memory: string;
  gpu: boolean;
  gpuModel: string;
}

function Navbar() {
  return (
    <nav className="border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Terminal className="h-6 w-6 text-teal-500" />
            <span className="text-lg font-semibold text-teal-500">morpheus deploy</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function StepIndicator({
  currentStep,
  steps,
}: {
  currentStep: Step;
  steps: { id: Step; label: string }[];
}) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`
            flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
            ${index <= currentIndex ? 'bg-teal-500 text-white' : 'bg-muted text-muted-foreground'}
          `}
          >
            {index < currentIndex ? <Check className="h-4 w-4" /> : index + 1}
          </div>
          <span
            className={`ml-2 text-sm hidden sm:inline ${index <= currentIndex ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div
              className={`w-8 sm:w-16 h-px mx-2 sm:mx-4 ${index < currentIndex ? 'bg-teal-500' : 'bg-border'}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ConnectStep({ onConnect }: { onConnect: () => void }) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsConnecting(false);
    onConnect();
  };

  return (
    <div className="text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-6">
        <Wallet className="h-8 w-8 text-teal-500" />
      </div>
      <h2 className="text-2xl font-bold mb-3">Connect Your Wallet</h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Use your Smart Wallet to authenticate. Deployments will be funded from your connected
        wallet.
      </p>
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-8 py-4 text-lg font-medium text-white shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="h-5 w-5" />
            Connect Wallet
          </>
        )}
      </button>
      <p className="text-sm text-muted-foreground mt-6">
        Supports Coinbase Smart Wallet, MetaMask, and WalletConnect
      </p>
    </div>
  );
}

function RepoStep({
  config,
  onUpdate,
  onNext,
  onBack,
}: {
  config: DeployConfig;
  onUpdate: (updates: Partial<DeployConfig>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!config.repoUrl) {
      return;
    }
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    onNext();
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mx-auto w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-6">
        <Github className="h-8 w-8 text-teal-500" />
      </div>
      <h2 className="text-2xl font-bold mb-3 text-center">Import Repository</h2>
      <p className="text-muted-foreground mb-8 text-center max-w-md mx-auto">
        Enter your GitHub repository URL or connect with GitHub to browse your repos.
      </p>

      <div className="max-w-lg mx-auto space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Repository URL</label>
          <input
            type="text"
            placeholder="github.com/username/repo"
            value={config.repoUrl}
            onChange={(e) => onUpdate({ repoUrl: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Branch</label>
          <input
            type="text"
            placeholder="main"
            value={config.branch}
            onChange={(e) => onUpdate({ branch: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          />
        </div>

        <div className="pt-4">
          <button
            onClick={handleAnalyze}
            disabled={!config.repoUrl || isLoading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-8 py-4 text-lg font-medium text-white shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Link
          href="https://github.com/morpheus-deploy/morpheus-deploy"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-8 py-4 text-lg font-medium hover:bg-muted transition-colors"
        >
          <Github className="h-5 w-5" />
          View on GitHub
        </Link>
      </div>
    </div>
  );
}

function ConfigStep({
  config,
  onUpdate,
  onNext,
  onBack,
}: {
  config: DeployConfig;
  onUpdate: (updates: Partial<DeployConfig>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const templates = [
    { id: 'ai-agent', label: 'AI Agent', description: 'GPU-enabled AI inference' },
    { id: 'mcp-server', label: 'MCP Server', description: 'Model Context Protocol' },
    { id: 'website', label: 'Website', description: 'Static or dynamic sites' },
    { id: 'custom', label: 'Custom', description: 'Full configuration control' },
  ] as const;

  const estimate = {
    hourly: config.gpu ? 0.65 : 0.08,
    monthly: config.gpu ? 468 : 57.6,
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h2 className="text-2xl font-bold mb-3 text-center">Configure Deployment</h2>
      <p className="text-muted-foreground mb-8 text-center max-w-md mx-auto">
        Choose your template and resources. We auto-detected your project settings.
      </p>

      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <label className="block text-sm font-medium mb-3">Template</label>
          <div className="grid grid-cols-2 gap-3">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => onUpdate({ template: t.id })}
                className={`p-4 rounded-xl border text-left transition-all ${
                  config.template === t.id
                    ? 'border-teal-500 bg-teal-500/10'
                    : 'border-border hover:border-teal-500/50'
                }`}
              >
                <div className="font-medium">{t.label}</div>
                <div className="text-sm text-muted-foreground">{t.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-3">
              <Cpu className="h-4 w-4 inline mr-2" />
              CPU Cores
            </label>
            <input
              type="range"
              min="0.5"
              max="8"
              step="0.5"
              value={config.cpu}
              onChange={(e) => onUpdate({ cpu: parseFloat(e.target.value) })}
              className="w-full accent-teal-500"
            />
            <div className="text-sm text-muted-foreground mt-1">{config.cpu} vCPU</div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">
              <HardDrive className="h-4 w-4 inline mr-2" />
              Memory
            </label>
            <select
              value={config.memory}
              onChange={(e) => onUpdate({ memory: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            >
              <option value="512Mi">512 MB</option>
              <option value="1Gi">1 GB</option>
              <option value="2Gi">2 GB</option>
              <option value="4Gi">4 GB</option>
              <option value="8Gi">8 GB</option>
              <option value="16Gi">16 GB</option>
            </select>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.gpu}
              onChange={(e) => onUpdate({ gpu: e.target.checked })}
              className="rounded border-border accent-teal-500 h-5 w-5"
            />
            <div>
              <div className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-teal-500" />
                Enable GPU
              </div>
              <div className="text-sm text-muted-foreground">For AI inference workloads</div>
            </div>
          </label>

          {config.gpu && (
            <select
              value={config.gpuModel}
              onChange={(e) => onUpdate({ gpuModel: e.target.value })}
              className="mt-3 w-full rounded-lg border border-border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            >
              <option value="rtx4090">NVIDIA RTX 4090</option>
              <option value="a100">NVIDIA A100</option>
              <option value="h100">NVIDIA H100</option>
            </select>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold mb-4">Cost Estimate</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground">Hourly</span>
            <span className="font-mono">${estimate.hourly.toFixed(2)}/hr</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Monthly (estimate)</span>
            <span className="font-mono text-teal-500">${estimate.monthly.toFixed(0)}/mo</span>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Pay with USDC. Automatically converted to AKT.
          </p>
        </div>

        <button
          onClick={onNext}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-8 py-4 text-lg font-medium text-white shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 transition-all hover:scale-105"
        >
          Deploy
          <Rocket className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function DeployStep({
  config: _config,
  onBack: _onBack,
}: {
  config: DeployConfig;
  onBack: () => void;
}) {
  const [status, setStatus] = useState<'deploying' | 'success'>('deploying');
  const [progress, setProgress] = useState(0);

  useState(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setStatus('success');
          return 100;
        }
        return p + 10;
      });
    }, 500);
    return () => clearInterval(interval);
  });

  if (status === 'success') {
    return (
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mb-6">
          <Check className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Deployment Successful!</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Your application is now live on Akash Network.
        </p>

        <div className="rounded-xl border border-border bg-card p-6 max-w-lg mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">URL</span>
            <a
              href="https://abc123.akash.network"
              target="_blank"
              className="flex items-center gap-1 text-teal-500 hover:underline"
            >
              abc123.akash.network
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">DSEQ</span>
            <span className="font-mono">1704067200</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Provider</span>
            <span className="font-mono text-sm">akash1provider...</span>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-3 font-medium text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transition-all"
          >
            View Dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 font-medium hover:bg-muted transition-colors"
          >
            Deploy Another
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-6">
        <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
      </div>
      <h2 className="text-2xl font-bold mb-3">Deploying...</h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Building your container and deploying to Akash Network.
      </p>

      <div className="max-w-md mx-auto">
        <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-teal-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">{progress}% complete</p>
      </div>

      <div className="mt-8 text-left max-w-md mx-auto rounded-lg bg-[#0d1117] p-4 font-mono text-sm">
        <div className="text-green-400">Building container...</div>
        {progress > 30 && <div className="text-green-400">Pushing to registry...</div>}
        {progress > 50 && <div className="text-green-400">Creating deployment...</div>}
        {progress > 70 && <div className="text-green-400">Waiting for bids...</div>}
        {progress > 90 && <div className="text-yellow-400">Sending manifest...</div>}
      </div>
    </div>
  );
}

function DeployPageContent() {
  const searchParams = useSearchParams();
  const initialRepo = searchParams.get('repo') || '';
  const initialTemplate = (searchParams.get('template') || 'ai-agent') as DeployConfig['template'];

  const [step, setStep] = useState<Step>('connect');
  const [config, setConfig] = useState<DeployConfig>({
    repoUrl: initialRepo,
    branch: 'main',
    template: initialTemplate,
    cpu: 2,
    memory: '4Gi',
    gpu: initialTemplate === 'ai-agent',
    gpuModel: 'rtx4090',
  });

  const steps: { id: Step; label: string }[] = [
    { id: 'connect', label: 'Connect' },
    { id: 'repo', label: 'Repository' },
    { id: 'config', label: 'Configure' },
    { id: 'deploy', label: 'Deploy' },
  ];

  const updateConfig = (updates: Partial<DeployConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <StepIndicator currentStep={step} steps={steps} />

          <div className="bg-card border border-border/50 rounded-2xl p-8">
            {step === 'connect' && <ConnectStep onConnect={() => setStep('repo')} />}
            {step === 'repo' && (
              <RepoStep
                config={config}
                onUpdate={updateConfig}
                onNext={() => setStep('config')}
                onBack={() => setStep('connect')}
              />
            )}
            {step === 'config' && (
              <ConfigStep
                config={config}
                onUpdate={updateConfig}
                onNext={() => setStep('deploy')}
                onBack={() => setStep('repo')}
              />
            )}
            {step === 'deploy' && <DeployStep config={config} onBack={() => setStep('config')} />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DeployPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
        </div>
      }
    >
      <DeployPageContent />
    </Suspense>
  );
}
