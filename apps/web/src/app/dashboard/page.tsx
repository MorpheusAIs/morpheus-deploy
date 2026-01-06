'use client';

import {
  Activity,
  ChevronDown,
  Clock,
  Cpu,
  DollarSign,
  ExternalLink,
  Filter,
  HardDrive,
  MoreVertical,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Terminal,
  Trash2,
  Wallet,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

type DeploymentStatus = 'running' | 'deploying' | 'stopped' | 'failed';

interface Deployment {
  id: string;
  name: string;
  url: string;
  dseq: string;
  status: DeploymentStatus;
  template: string;
  createdAt: string;
  monthlyCost: number;
  resources: {
    cpu: number;
    memory: string;
    gpu?: string;
  };
}

const mockDeployments: Deployment[] = [
  {
    id: '1',
    name: 'claude-agent-prod',
    url: 'abc123.akash.network',
    dseq: '1704067200',
    status: 'running',
    template: 'ai-agent',
    createdAt: '2024-01-05T10:30:00Z',
    monthlyCost: 85.5,
    resources: { cpu: 4, memory: '8Gi', gpu: 'RTX 4090' },
  },
  {
    id: '2',
    name: 'mcp-tools-server',
    url: 'def456.akash.network',
    dseq: '1704067201',
    status: 'running',
    template: 'mcp-server',
    createdAt: '2024-01-04T14:20:00Z',
    monthlyCost: 28.0,
    resources: { cpu: 2, memory: '4Gi' },
  },
  {
    id: '3',
    name: 'landing-page-preview',
    url: 'ghi789.akash.network',
    dseq: '1704067202',
    status: 'deploying',
    template: 'website',
    createdAt: '2024-01-05T16:45:00Z',
    monthlyCost: 12.0,
    resources: { cpu: 1, memory: '1Gi' },
  },
  {
    id: '4',
    name: 'api-gateway-staging',
    url: 'jkl012.akash.network',
    dseq: '1704067203',
    status: 'failed',
    template: 'custom',
    createdAt: '2024-01-03T09:15:00Z',
    monthlyCost: 0,
    resources: { cpu: 2, memory: '2Gi' },
  },
];

const statusConfig: Record<DeploymentStatus, { color: string; bg: string; label: string }> = {
  running: { color: 'text-green-400', bg: 'bg-green-500/10', label: 'Running' },
  deploying: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Deploying' },
  stopped: { color: 'text-gray-400', bg: 'bg-gray-500/10', label: 'Stopped' },
  failed: { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Failed' },
};

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <Terminal className="h-6 w-6 text-teal-500" />
              <span className="text-lg font-semibold text-teal-500">morpheus deploy</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-sm text-foreground font-medium">
                Dashboard
              </Link>
              <Link
                href="/settings"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Settings
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
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
              <Wallet className="h-4 w-4 text-teal-500" />
              <span className="text-muted-foreground">0x1234...5678</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function StatsCard({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-lg bg-teal-500/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-teal-500" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subValue && <div className="text-sm text-muted-foreground mt-1">{subValue}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: DeploymentStatus }) {
  const config = statusConfig[status];
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}
    >
      <div
        className={`h-1.5 w-1.5 rounded-full ${status === 'running' ? 'animate-pulse' : ''} ${config.color.replace('text-', 'bg-')}`}
      />
      {config.label}
    </div>
  );
}

function DeploymentCard({ deployment }: { deployment: Deployment }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6 hover:border-teal-500/50 transition-all hover:shadow-xl hover:shadow-teal-500/5 group">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg mb-1">{deployment.name}</h3>
          <a
            href={`https://${deployment.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-teal-500 hover:underline"
          >
            {deployment.url}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={deployment.status} />
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-border bg-card shadow-xl py-1 z-10">
                <button className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Fund Escrow
                </button>
                <button className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  View Logs
                </button>
                <button className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Redeploy
                </button>
                <hr className="my-1 border-border" />
                {deployment.status === 'running' ? (
                  <button className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-yellow-500">
                    <Pause className="h-4 w-4" />
                    Stop
                  </button>
                ) : (
                  <button className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-green-500">
                    <Play className="h-4 w-4" />
                    Start
                  </button>
                )}
                <button className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-red-500">
                  <Trash2 className="h-4 w-4" />
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground mb-1">DSEQ</div>
          <div className="font-mono">{deployment.dseq}</div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1">Template</div>
          <div className="capitalize">{deployment.template.replace('-', ' ')}</div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1">Created</div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            {formatDate(deployment.createdAt)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1">Cost</div>
          <div className="text-teal-500 font-semibold">${deployment.monthlyCost.toFixed(2)}/mo</div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Cpu className="h-3 w-3" />
          {deployment.resources.cpu} vCPU
        </div>
        <div className="flex items-center gap-1">
          <HardDrive className="h-3 w-3" />
          {deployment.resources.memory}
        </div>
        {deployment.resources.gpu && (
          <div className="flex items-center gap-1 text-teal-500">
            <Zap className="h-3 w-3" />
            {deployment.resources.gpu}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-6">
        <Terminal className="h-8 w-8 text-teal-500" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No deployments yet</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Deploy your first AI agent, MCP server, or website to Akash Network in minutes.
      </p>
      <Link
        href="/deploy"
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-3 font-medium text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transition-all hover:scale-105"
      >
        <Plus className="h-5 w-5" />
        Create Deployment
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const [filterStatus, setFilterStatus] = useState<DeploymentStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDeployments = mockDeployments.filter((d) => {
    const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalMonthlyCost = mockDeployments
    .filter((d) => d.status === 'running')
    .reduce((sum, d) => sum + d.monthlyCost, 0);

  const runningCount = mockDeployments.filter((d) => d.status === 'running').length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-1">Deployments</h1>
              <p className="text-muted-foreground">Manage your deployments on Akash Network</p>
            </div>
            <Link
              href="/deploy"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transition-all hover:scale-105"
            >
              <Plus className="h-4 w-4" />
              New Deployment
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard
              icon={Activity}
              label="Active Deployments"
              value={runningCount.toString()}
              subValue={`${mockDeployments.length} total`}
            />
            <StatsCard
              icon={DollarSign}
              label="Escrow Balance"
              value="$142.50"
              subValue="~45 days remaining"
            />
            <StatsCard
              icon={DollarSign}
              label="Monthly Spend"
              value={`$${totalMonthlyCost.toFixed(0)}`}
              subValue="estimated"
            />
            <StatsCard icon={Zap} label="GPU Hours" value="324" subValue="this month" />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search deployments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as DeploymentStatus | 'all')}
                className="appearance-none rounded-lg border border-border bg-background pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              >
                <option value="all">All Status</option>
                <option value="running">Running</option>
                <option value="deploying">Deploying</option>
                <option value="stopped">Stopped</option>
                <option value="failed">Failed</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {filteredDeployments.length === 0 ? (
            searchQuery || filterStatus !== 'all' ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No deployments match your filters.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('all');
                  }}
                  className="mt-2 text-teal-500 hover:underline text-sm"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <EmptyState />
            )
          ) : (
            <div className="grid gap-4">
              {filteredDeployments.map((deployment) => (
                <DeploymentCard key={deployment.id} deployment={deployment} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
