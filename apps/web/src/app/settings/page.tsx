'use client';
import {
  AlertCircle,
  Bell,
  Check,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Github,
  Key,
  Plus,
  Shield,
  Terminal,
  Trash2,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Footer } from '@/components/footer';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string | null;
}

const mockApiKeys: ApiKey[] = [
  {
    id: '1',
    name: 'Production Agent',
    prefix: 'mor_sk_abc1...xyz9',
    createdAt: '2024-01-02T10:00:00Z',
    lastUsed: '2024-01-05T14:30:00Z',
  },
  {
    id: '2',
    name: 'CI/CD Pipeline',
    prefix: 'mor_sk_def2...uvw8',
    createdAt: '2024-01-03T15:00:00Z',
    lastUsed: null,
  },
];

type TabId = 'api-keys' | 'github' | 'wallet' | 'notifications';

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
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Link href="/settings" className="text-sm text-foreground font-medium">
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

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-teal-500/10 text-teal-500'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>(mockApiKeys);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateKey = () => {
    const mockSecret = `mor_sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setNewKeySecret(mockSecret);
    setKeys([
      ...keys,
      {
        id: Date.now().toString(),
        name: newKeyName || 'Untitled Key',
        prefix: `${mockSecret.substring(0, 10)}...${mockSecret.substring(mockSecret.length - 4)}`,
        createdAt: new Date().toISOString(),
        lastUsed: null,
      },
    ]);
    setNewKeyName('');
  };

  const handleCopy = () => {
    if (newKeySecret) {
      navigator.clipboard.writeText(newKeySecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDeleteKey = (id: string) => {
    setKeys(keys.filter((k) => k.id !== id));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Manage API keys for programmatic deployments
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transition-all hover:scale-105"
        >
          <Plus className="h-4 w-4" />
          Create Key
        </button>
      </div>

      {newKeySecret && (
        <div className="mb-6 p-4 rounded-xl border border-yellow-500/50 bg-yellow-500/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-500 mb-2">
                Save your API key now - it won&apos;t be shown again!
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background rounded-lg px-3 py-2 text-sm font-mono">
                  {newKeySecret}
                </code>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              <button
                onClick={() => setNewKeySecret(null)}
                className="mt-3 text-sm text-yellow-500 hover:underline"
              >
                I&apos;ve saved my key
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && !newKeySecret && (
        <div className="mb-6 p-4 rounded-xl border border-border bg-card">
          <h3 className="font-medium mb-3">Create new API key</h3>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Key name (e.g., Production Agent)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            />
            <button
              onClick={handleCreateKey}
              className="px-4 py-2 rounded-lg bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowCreateModal(false);
                setNewKeyName('');
              }}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {keys.map((key) => (
          <div
            key={key.id}
            className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-teal-500/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <Key className="h-5 w-5 text-teal-500" />
              </div>
              <div>
                <div className="font-medium">{key.name}</div>
                <div className="text-sm text-muted-foreground font-mono">{key.prefix}</div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right text-sm">
                <div className="text-muted-foreground">Created {formatDate(key.createdAt)}</div>
                <div className="text-muted-foreground">
                  {key.lastUsed ? `Last used ${formatDate(key.lastUsed)}` : 'Never used'}
                </div>
              </div>
              <button
                onClick={() => handleDeleteKey(key.id)}
                className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {keys.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Key className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>No API keys yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function GitHubTab() {
  const [connected, setConnected] = useState(true);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-1">GitHub Integration</h2>
        <p className="text-sm text-muted-foreground">
          Connect GitHub to enable auto-deploy from your repositories
        </p>
      </div>

      {connected ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-[#24292e] flex items-center justify-center">
                <Github className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="font-medium">morpheus-developer</div>
                <div className="text-sm text-muted-foreground">Connected Jan 2, 2024</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/morpheus-developer"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
              <button
                onClick={() => setConnected(false)}
                className="px-4 py-2 rounded-lg border border-red-500/50 text-red-500 text-sm font-medium hover:bg-red-500/10 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-3">Webhook Repositories</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enable auto-deploy for these repositories when you push to the main branch.
            </p>
            <div className="space-y-2">
              {['claude-agent', 'mcp-tools-server', 'landing-page'].map((repo) => (
                <div
                  key={repo}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <span className="text-sm font-mono">morpheus-developer/{repo}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-teal-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[#24292e] flex items-center justify-center mb-6">
            <Github className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Connect GitHub</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Connect your GitHub account to import repositories and enable automatic deployments.
          </p>
          <Link
            href="https://github.com/morpheusais/morpheus-deploy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#24292e] px-6 py-3 font-medium text-white hover:bg-[#374151] transition-colors"
          >
            <Github className="h-5 w-5" />
            View on GitHub
          </Link>
        </div>
      )}
    </div>
  );
}

function WalletTab() {
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-1">Wallet</h2>
        <p className="text-sm text-muted-foreground">
          Manage your connected wallet and funding settings
        </p>
      </div>

      <div className="space-y-6">
        <div className="p-6 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="font-medium">Smart Wallet</div>
                <div className="text-sm text-muted-foreground font-mono">
                  0x1234567890abcdef1234567890abcdef12345678
                </div>
              </div>
            </div>
            <a
              href="https://basescan.org/address/0x1234567890abcdef1234567890abcdef12345678"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-1">USDC Balance</div>
              <div className="text-xl font-semibold">$1,245.00</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-1">MOR Staked</div>
              <div className="text-xl font-semibold">500 MOR</div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-5 w-5 text-teal-500" />
            <h3 className="font-medium">Ephemeral Keys</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Ephemeral keys are used for deployment operations with limited permissions. They expire
            after 24 hours.
          </p>
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <div className="text-sm font-medium">Current Ephemeral Key</div>
              <div className="text-sm text-muted-foreground font-mono">
                {showSecret ? 'akash1abc...xyz (expires in 18h)' : '••••••••••••••••••'}
              </div>
            </div>
            <button
              onClick={() => setShowSecret(!showSecret)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {showSecret ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card">
          <h3 className="font-medium mb-4">Auto Top-Up Settings</h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="text-sm font-medium">Enable Auto Top-Up</div>
                <div className="text-sm text-muted-foreground">
                  Automatically fund escrow when balance is low
                </div>
              </div>
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-teal-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4 relative" />
            </label>

            <div>
              <label className="block text-sm font-medium mb-2">Threshold</label>
              <select className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50">
                <option value="10">$10 remaining</option>
                <option value="25">$25 remaining</option>
                <option value="50">$50 remaining</option>
                <option value="100">$100 remaining</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Top-Up Amount</label>
              <select className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50">
                <option value="25">$25</option>
                <option value="50">$50</option>
                <option value="100">$100</option>
                <option value="250">$250</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-1">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Configure how you receive deployment notifications
        </p>
      </div>

      <div className="space-y-4">
        {[
          {
            title: 'Deployment Success',
            description: 'Receive a notification when a deployment completes successfully',
          },
          {
            title: 'Deployment Failed',
            description: 'Receive a notification when a deployment fails',
          },
          {
            title: 'Low Escrow Balance',
            description: 'Receive a notification when your escrow balance is running low',
          },
          {
            title: 'Provider Issues',
            description: 'Receive a notification if there are issues with your provider',
          },
        ].map((item) => (
          <label
            key={item.title}
            className="flex items-center justify-between p-4 rounded-xl border border-border bg-card cursor-pointer hover:border-teal-500/50 transition-colors"
          >
            <div>
              <div className="font-medium">{item.title}</div>
              <div className="text-sm text-muted-foreground">{item.description}</div>
            </div>
            <input type="checkbox" defaultChecked className="sr-only peer" />
            <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-teal-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4 relative flex-shrink-0" />
          </label>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('api-keys');

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'api-keys', label: 'API Keys', icon: Key },
    { id: 'github', label: 'GitHub', icon: Github },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="pt-24 pb-12 px-4 flex-1">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-1">Settings</h1>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-56 flex-shrink-0">
              <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                {tabs.map((tab) => (
                  <TabButton
                    key={tab.id}
                    active={activeTab === tab.id}
                    icon={tab.icon}
                    label={tab.label}
                    onClick={() => setActiveTab(tab.id)}
                  />
                ))}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="bg-card border border-border/50 rounded-2xl p-6 sm:p-8">
                {activeTab === 'api-keys' && <ApiKeysTab />}
                {activeTab === 'github' && <GitHubTab />}
                {activeTab === 'wallet' && <WalletTab />}
                {activeTab === 'notifications' && <NotificationsTab />}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
