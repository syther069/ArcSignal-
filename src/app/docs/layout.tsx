import type { ReactNode } from 'react';
import DocsHeader from '@/components/docs/DocsHeader';
import DocsSearch from '@/components/docs/DocsSearch';
import DocsSidebar from '@/components/docs/DocsSidebar';
import { getDocsSearchIndex } from '@/lib/docs-content';

export default function DocsLayout({ children }: { children: ReactNode }) {
  const searchRecords = getDocsSearchIndex();

  return (
    <div className="min-h-screen bg-[#09090d] text-slate-100 selection:bg-violet-500/30 selection:text-violet-200">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[120] -translate-y-24 rounded-lg bg-violet-300 px-4 py-2 text-sm font-bold text-slate-950 transition-transform focus:translate-y-0 shadow-lg"
      >
        Skip to content
      </a>
      <DocsHeader />
      <DocsSearch records={searchRecords} />
      <div className="flex min-h-screen pt-16">
        <DocsSidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

