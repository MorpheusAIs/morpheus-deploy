import { DocsLayout } from 'fumadocs-ui/layout';
import { Rocket } from 'lucide-react';
import type { ReactNode } from 'react';

import { source } from '@/lib/source';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
              <Rocket className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold">Morpheus</span>
          </div>
        ),
        url: '/',
      }}
      links={[
        {
          text: 'Main Site',
          url: 'http://localhost:3000',
          external: true,
        },
        {
          text: 'GitHub',
          url: 'https://github.com/morpheus-deploy/morpheus-deploy',
          external: true,
        },
      ]}
    >
      {children}
    </DocsLayout>
  );
}
