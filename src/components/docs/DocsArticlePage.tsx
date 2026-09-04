import type { DocsArticle } from '@/lib/docs-config';
import type { DocsHeading } from '@/lib/docs-content';
import { getAdjacentDocsArticles } from '@/lib/docs-config';
import DocsBreadcrumbs from './DocsBreadcrumbs';
import DocsLinkCard from './DocsLinkCard';
import DocsMarkdown from './DocsMarkdown';
import DocsPagination from './DocsPagination';
import DocsTableOfContents from './DocsTableOfContents';

const statusBadgeStyles: Record<DocsArticle['status'], { label: string; classes: string }> = {
  implemented: {
    label: 'Live on Testnet',
    classes: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
  },
  planned: {
    label: 'Planned Architecture',
    classes: 'border-amber-500/30 bg-amber-500/10 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.1)]',
  },
  testnet: {
    label: 'ARC Testnet Only',
    classes: 'border-violet-500/30 bg-violet-500/10 text-violet-300 shadow-[0_0_12px_rgba(168,85,247,0.15)]',
  },
  risk: {
    label: 'Security & Trust Risk',
    classes: 'border-rose-500/30 bg-rose-500/10 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]',
  },
  reference: {
    label: 'Protocol Reference',
    classes: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.15)]',
  },
};

const overviewPaths = [
  {
    href: '/docs/getting-started',
    eyebrow: 'I want to predict',
    title: 'Start on ARC Testnet',
    description: 'Set up MetaMask or Rabby, switch to ARC Testnet (5042002), obtain testnet USDC, and submit your first stake.',
  },
  {
    href: '/docs/how-it-works',
    eyebrow: 'I want to understand',
    title: 'Protocol Architecture',
    description: 'Understand how AI probability models, Follow vs Fade pari-mutuel pools, owner resolution, and manual claims interact.',
  },
  {
    href: '/docs/contracts',
    eyebrow: 'I want to build',
    title: 'Inspect Deployed Contracts',
    description: 'View the verified ArcSignal.sol contract address, public ABI interfaces, event definitions, and current trust limits.',
  },
];

export default function DocsArticlePage({
  article,
  body,
  headings,
}: {
  article: DocsArticle;
  body: string;
  headings: DocsHeading[];
}) {
  const isOverview = article.slug === '';
  const adjacent = getAdjacentDocsArticles(article.slug);
  const statusMeta = statusBadgeStyles[article.status];

  return (
    <div className="mx-auto flex w-full max-w-7xl justify-center px-4 py-8 sm:px-8 sm:py-12 lg:px-12 xl:gap-14">
      {/* Central Article Column (~720-760px wide) */}
      <article id="main-content" className="w-full max-w-[760px] min-w-0">
        <DocsBreadcrumbs title={article.title} isOverview={isOverview} />

        {/* Article Header */}
        <header className="mb-10 border-b border-white/10 pb-8">
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-400/80">
              Protocol Documentation
            </span>
            <span className="text-slate-600 font-mono text-xs">•</span>
            <span
              className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${statusMeta.classes}`}
            >
              {statusMeta.label}
            </span>
          </div>

          <h1 className="font-[family-name:var(--font-hanken)] text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-[42px] lg:leading-[1.15]">
            {article.title}
          </h1>

          <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-300 font-sans">
            {article.description}
          </p>
        </header>

        {/* Collapsible Table of Contents for Tablet/Mobile */}
        <DocsTableOfContents headings={headings} mode="mobile" />

        {/* Overview Three Paths (rendered only on /docs overview) */}
        {isOverview ? (
          <section aria-labelledby="choose-path" className="mb-12">
            <div className="mb-4">
              <h2 id="choose-path" className="font-[family-name:var(--font-hanken)] text-xl font-bold text-white">
                Choose your path
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                ArcSignal establishes distinct boundaries for market participants, researchers, and developers. Select your primary journey:
              </p>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-1">
              {overviewPaths.map((path) => (
                <DocsLinkCard key={path.href} {...path} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Markdown Content */}
        <DocsMarkdown source={body} />

        {/* Article Pagination */}
        <DocsPagination previous={adjacent.previous} next={adjacent.next} />
      </article>

      {/* Desktop Sticky Table of Contents Rail */}
      <DocsTableOfContents headings={headings} mode="desktop" />
    </div>
  );
}

