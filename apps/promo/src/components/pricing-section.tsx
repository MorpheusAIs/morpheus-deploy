'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const comparisons = [
  { resource: '2 vCPU, 4GB RAM', cloud: '$60/mo', morpheus: '$25/mo' },
  { resource: 'RTX 4090 GPU', cloud: '$1.50/hr', morpheus: '$0.50/hr' },
  { resource: 'A100 GPU', cloud: '$4.00/hr', morpheus: '$1.50/hr' },
  { resource: '100GB SSD', cloud: '$10/mo', morpheus: '$3/mo' },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            <span className="text-teal-500">70% Cheaper</span> Than Cloud
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Decentralized compute is more efficient. Pay only for what you use.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-card border border-border rounded-2xl overflow-hidden glow">
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 border-b border-border text-sm font-medium">
              <div>Resource</div>
              <div className="text-center">Traditional Cloud</div>
              <div className="text-center text-teal-500">Morpheus</div>
            </div>
            {comparisons.map((item, index) => (
              <motion.div
                key={item.resource}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`grid grid-cols-3 gap-4 p-4 ${
                  index !== comparisons.length - 1 ? 'border-b border-border/50' : ''
                }`}
              >
                <div className="font-medium">{item.resource}</div>
                <div className="text-center text-muted-foreground line-through">{item.cloud}</div>
                <div className="text-center text-teal-500 font-semibold">{item.morpheus}</div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-8 text-center"
          >
            <p className="text-muted-foreground text-sm mb-6">
              Pay with USDC. No credit cards, no invoices, no KYC.
            </p>
            <a
              href="https://morpheus.network/deploy"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-8 py-4 text-lg font-medium text-white shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 transition-all hover:scale-105"
            >
              Start Deploying
              <ArrowRight className="h-5 w-5" />
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
