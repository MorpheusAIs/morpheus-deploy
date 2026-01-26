'use client';

import { motion } from 'framer-motion';
import { Wallet, Github, Cloud } from 'lucide-react';

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

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 sm:py-32 relative">
      <div className="absolute inset-0 grid-pattern opacity-50" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Deploy in <span className="text-teal-500">Three Steps</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From code to running container in under 2 minutes
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative group"
            >
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
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
