'use client';

import { Terminal } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/50 py-12 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
          <a href="/" className="flex items-center gap-2">
            <Terminal className="h-6 w-6 text-teal-500" />
            <span className="text-lg font-semibold text-white">morpheus deploy</span>
          </a>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a
              href="https://mor.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              About Morpheus
            </a>
            <a
              href="https://docs.morpheus.network"
              className="hover:text-foreground transition-colors"
            >
              Documentation
            </a>
            <a
              href="https://github.com/morpheusais/morpheus-deploy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://discord.gg/kyVaxTHnvB"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Discord
            </a>
            <a
              href="https://x.com/morpheusais"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              X
            </a>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground pt-8 border-t border-border/50">
          © 2025 by Morpheus. Open source infrastructure for Agentic AI.
        </div>
      </div>
    </footer>
  );
}
