import type { ReactNode } from 'react';
import DocsHeader from '@/components/docs/DocsHeader';
import DocsSearch from '@/components/docs/DocsSearch';
import DocsSidebar from '@/components/docs/DocsSidebar';
import { getDocsSearchIndex } from '@/lib/docs-content';

export default function DocsLayout({ children }: { children: ReactNode }) {
  const searchRecords = getDocsSearchIndex();

  return (
    <div className="min-h-screen bg-[#0d0d11] text-slate-100">
      <a href="#main-content" className="fixed left-4 top-2 z-[120] -translate-y-20 rounded-lg bg-violet-200 px-4 py-2 text-sm font-semibold text-slate-950 transition-transform focus:translate-y-0">Skip to content</a>
      <DocsHeader />
      <DocsSearch records={searchRecords} />
      <div className="grid min-h-screen pt-16 lg:grid-cols-[280px_minmax(0,1fr)]">
        <DocsSidebar />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
