'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { docsArticles, docsSections, getDocsHref } from '@/lib/docs-config';

export default function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden border-r border-white/[0.07] lg:block" aria-label="Documentation sidebar">
      <div className="sticky top-16 h-[calc(100vh-64px)] overflow-y-auto px-6 pb-7 pt-[84px] custom-scrollbar">
        <nav aria-label="Documentation">
          {docsSections.map((section) => {
            const articles = docsArticles.filter((article) => article.section === section.id);
            return (
              <div key={section.id} className="mb-7">
                <h2 className="mb-2 px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">{section.label}</h2>
                <ul className="space-y-0.5">
                  {articles.map((article) => {
                    const href = getDocsHref(article.slug);
                    const active = pathname === href;
                    return (
                      <li key={href}>
                        <Link href={href} aria-current={active ? 'page' : undefined} className={`block rounded-lg border-l-2 px-3 py-2 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${active ? 'border-violet-300 bg-violet-300/[0.08] text-violet-100' : 'border-transparent text-slate-500 hover:bg-white/[0.035] hover:text-slate-200'}`}>
                          {article.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
