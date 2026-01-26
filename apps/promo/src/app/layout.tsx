import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'Morpheus Deploy | Decentralized Infrastructure for AI Agents',
  description:
    'One-click deployments for AI agents, MCP servers, and web apps. Pay with crypto, deploy on sovereign compute. The Vercel for decentralized infrastructure.',
  keywords: [
    'decentralized',
    'deployment',
    'AI agents',
    'Akash Network',
    'crypto',
    'cloud computing',
    'GPU',
    'infrastructure',
  ],
  openGraph: {
    title: 'Morpheus Deploy | Decentralized Infrastructure for AI Agents',
    description:
      'One-click deployments for AI agents, MCP servers, and web apps. Pay with crypto, deploy on sovereign compute.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
