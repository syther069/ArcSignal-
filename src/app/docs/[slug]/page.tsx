import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DocsArticlePage from '@/components/docs/DocsArticlePage';
import { docsArticles } from '@/lib/docs-config';
import { getDocsArticle } from '@/lib/docs-content';

type DocsPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return docsArticles.filter((article) => article.slug).map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: DocsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocsArticle(slug);
  if (!doc) return {};
  return {
    title: `${doc.article.title} · ArcSignal Docs`,
    description: doc.article.description,
    alternates: { canonical: `https://arc-signal.xyz/docs/${doc.article.slug}` },
  };
}

export default async function DocsArticleRoute({ params }: DocsPageProps) {
  const { slug } = await params;
  const doc = getDocsArticle(slug);
  if (!doc) notFound();
  return <DocsArticlePage {...doc} />;
}
