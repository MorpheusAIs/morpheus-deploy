'use client';

import { motion } from 'framer-motion';
import { Terminal, ArrowRight } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-teal-950/10 to-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-500/5 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-4 py-1.5 text-sm text-teal-400 mb-8">
            <Terminal className="h-3.5 w-3.5" />
            Ready to deploy?
          </div>

          <h2 className="text-3xl sm:text-5xl font-bold mb-6">
            Start Building on
            <br />
            <span className="gradient-text">Sovereign Infrastructure</span>
          </h2>

          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join thousands of developers deploying AI agents and web apps on decentralized compute.
            No vendor lock-in, no rate limits.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://morpheus.network/deploy"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-8 py-4 text-lg font-medium text-white shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 transition-all hover:scale-105"
            >
              Deploy Your First App
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="https://docs.morpheus.network"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/50 px-8 py-4 text-lg font-medium hover:bg-card transition-colors"
            >
              Read the Docs
            </a>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12 p-6 rounded-2xl bg-card/50 border border-border/50 max-w-xl mx-auto"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground ml-2 font-mono">terminal</span>
            </div>
            <div className="font-mono text-sm text-left space-y-2">
              <p className="text-muted-foreground">
                <span className="text-teal-500">$</span> npx morpheus-deploy init
              </p>
              <p className="text-muted-foreground">
                <span className="text-teal-500">$</span> npx morpheus-deploy deploy
              </p>
              <p className="text-green-400">✓ Deployed to https://my-agent.akash.network</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
