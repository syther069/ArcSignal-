import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DocsArticlePage from '@/components/docs/DocsArticlePage';
import { docsArticles } from '@/lib/docs-config';
import { getDocsArticle } from '@/lib/docs-content';

type DocsPageProps = { params: { slug: string } };

export function generateStaticParams() {
  return docsArticles.filter((article) => article.slug).map((article) => ({ slug: article.slug }));
}

export function generateMetadata({ params }: DocsPageProps): Metadata {
  const doc = getDocsArticle(params.slug);
  if (!doc) return {};
  return {
    title: `${doc.article.title} · ArcSignal Docs`,
    description: doc.article.description,
    alternates: { canonical: `https://arc-signal.xyz/docs/${doc.article.slug}` },
  };
}

export default function DocsArticleRoute({ params }: DocsPageProps) {
  const doc = getDocsArticle(params.slug);
  if (!doc) notFound();
  return <DocsArticlePage {...doc} />;
}
