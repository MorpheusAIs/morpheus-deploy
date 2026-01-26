'use client';

import { motion } from 'framer-motion';
import { Terminal, Wallet, Cpu, Activity, RefreshCw, Shield } from 'lucide-react';

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 sm:py-32 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything You Need to <span className="text-teal-500">Ship Fast</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            The developer experience of Vercel, the sovereignty of decentralized compute
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group relative bg-background border border-border/50 rounded-2xl p-6 hover:border-teal-500/50 transition-all hover:shadow-xl hover:shadow-teal-500/5"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-teal-500/10 text-teal-500 mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
