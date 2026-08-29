import MarketDetailClient from './MarketDetailClient';
import { serializeMarket } from '@/lib/markets';
import { getIndexedMarketById } from '@/lib/indexed-markets';
import { toUiMarket } from '@/lib/ui-market';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rawMarket = await getIndexedMarketById(id);

  if (!rawMarket) {
    notFound();
  }

  const serialized = serializeMarket(rawMarket);
  const market = toUiMarket(serialized);

  return <MarketDetailClient market={market} />;
}

