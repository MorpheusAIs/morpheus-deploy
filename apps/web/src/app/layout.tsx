import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: 'Morpheus Deploy - Decentralized Deployment Platform',
  description:
    'Deploy AI agents, MCP servers, and web applications to Akash Network with one click. The Vercel for decentralized infrastructure.',
  keywords: ['akash', 'deployment', 'decentralized', 'ai-agents', 'blockchain', 'depin'],
  openGraph: {
    title: 'Morpheus Deploy',
    description: 'One-click decentralized deployments for AI agents',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
