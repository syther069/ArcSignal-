import type { Metadata } from 'next';
import DocsArticlePage from '@/components/docs/DocsArticlePage';
import { getDocsArticle } from '@/lib/docs-content';

export const metadata: Metadata = {
  title: 'Documentation · ArcSignal',
  description: 'Understand ArcSignal, place a testnet prediction, or inspect the contracts behind the protocol.',
  alternates: { canonical: 'https://arc-signal.xyz/docs' },
};

export default function DocsOverviewPage() {
  const doc = getDocsArticle('');
  if (!doc) return null;
  return <DocsArticlePage {...doc} />;
}
