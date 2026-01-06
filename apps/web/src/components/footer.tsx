import { Terminal } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border/50 py-12 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
          <Link href="/" className="flex items-center gap-2">
            <Terminal className="h-6 w-6 text-teal-500" />
            <span className="text-lg font-semibold text-white">morpheus deploy</span>
          </Link>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link
              href="https://mor.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              About Morpheus
            </Link>
            <Link href="/docs" className="hover:text-foreground transition-colors">
              Documentation
            </Link>
            <Link
              href="https://github.com/morpheusais/morpheus-deploy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </Link>
            <Link
              href="https://discord.gg/kyVaxTHnvB"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Discord
            </Link>
            <Link
              href="https://x.com/morpheusais"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              X
            </Link>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground pt-8 border-t border-border/50">
          © 2025 by Morpheus. Open source infrastructure for Agentic AI.
        </div>
      </div>
    </footer>
  );
}
