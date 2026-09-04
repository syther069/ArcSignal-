import type { ReactNode } from 'react';
import DocsHeader from '@/components/docs/DocsHeader';
import DocsSearch from '@/components/docs/DocsSearch';
import DocsSidebar from '@/components/docs/DocsSidebar';
import { getDocsSearchIndex } from '@/lib/docs-content';

export default function DocsLayout({ children }: { children: ReactNode }) {
  const searchRecords = getDocsSearchIndex();

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] font-[family-name:var(--font-inter)] selection:bg-[#ddb7ff]/20 selection:text-[#ddb7ff]">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[120] -translate-y-24 rounded-lg bg-[#ddb7ff] px-4 py-2 text-xs font-bold text-[#121212] transition-transform focus:translate-y-0 shadow-lg"
      >
        Skip to content
      </a>
      <DocsHeader />
      <DocsSearch records={searchRecords} />
      <div className="flex min-h-screen pt-16">
        <DocsSidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#131313]">{children}</main>
      </div>
    </div>
  );
}
