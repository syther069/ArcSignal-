import type { DocsArticle } from '@/lib/docs-config';
import type { DocsHeading } from '@/lib/docs-content';
import { getAdjacentDocsArticles } from '@/lib/docs-config';
import DocsBreadcrumbs from './DocsBreadcrumbs';
import DocsLinkCard from './DocsLinkCard';
import DocsMarkdown from './DocsMarkdown';
import DocsPagination from './DocsPagination';
import DocsTableOfContents from './DocsTableOfContents';

const statusClasses: Record<DocsArticle['status'], string> = {
  implemented: 'border-emerald-300/25 bg-emerald-300/[0.06] text-emerald-200',
  planned: 'border-slate-500/50 bg-slate-500/[0.08] text-slate-300',
  testnet: 'border-violet-300/25 bg-violet-300/[0.07] text-violet-200',
  risk: 'border-amber-300/25 bg-amber-300/[0.06] text-amber-200',
  reference: 'border-cyan-300/25 bg-cyan-300/[0.05] text-cyan-200',
};

const overviewPaths = [
  { href: '/docs/getting-started', eyebrow: 'I want to predict', title: 'Start on testnet', description: 'Connect a wallet, fund it with test assets, and place your first Follow or Fade stake.' },
  { href: '/docs/how-it-works', eyebrow: 'I want to understand', title: 'Map the protocol', description: 'See how AI signals, on-chain pools, owner-controlled resolution, and manual claims fit together.' },
  { href: '/docs/contracts', eyebrow: 'I want to build', title: 'Inspect the contracts', description: 'Read the deployed addresses, public interface, events, and current integration boundaries.' },
];

export default function DocsArticlePage({ article, body, headings }: { article: DocsArticle; body: string; headings: DocsHeading[] }) {
  const isOverview = article.slug === '';
  const adjacent = getAdjacentDocsArticles(article.slug);

  return (
    <div className="grid min-w-0 gap-12 px-5 py-10 sm:px-8 lg:px-10 xl:grid-cols-[minmax(0,760px)_220px] xl:justify-center xl:gap-16 2xl:px-14">
      <article id="main-content" className="min-w-0">
        <DocsBreadcrumbs title={article.title} isOverview={isOverview} />
        <header className="mb-10 border-b border-white/10 pb-9">
          <div className="mb-4 flex items-center gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300/70">Documentation</span>
            <span className={`rounded-full border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] ${statusClasses[article.status]}`}>{article.status}</span>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-[-0.035em] text-white sm:text-5xl">{article.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-400">{article.description}</p>
        </header>

        <DocsTableOfContents headings={headings} mode="mobile" />

        {isOverview ? (
          <section aria-labelledby="choose-path" className="mb-12">
            <h2 id="choose-path" className="font-display text-2xl font-semibold text-white">Choose your path</h2>
            <p className="mt-3 text-[15px] leading-7 text-slate-400">ArcSignal has different trust and workflow boundaries for participants and developers. Start with the path that matches what you need.</p>
            <div className="mt-6 grid gap-3">{overviewPaths.map((path) => <DocsLinkCard key={path.href} {...path} />)}</div>
          </section>
        ) : null}

        <DocsMarkdown source={body} />
        <DocsPagination previous={adjacent.previous} next={adjacent.next} />
      </article>
      <DocsTableOfContents headings={headings} mode="desktop" />
    </div>
  );
}
