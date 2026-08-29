import MarketDetailClient from './MarketDetailClient';
import { serializeMarket } from '@/lib/markets';
import { getIndexedMarketById } from '@/lib/indexed-markets';
import { toUiMarket } from '@/lib/ui-market';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MarketDetailPage({ params }: { params: { id: string } }) {
  const rawMarket = await getIndexedMarketById(params.id);

  if (!rawMarket) {
    notFound();
  }

  const serialized = serializeMarket(rawMarket);
  const market = toUiMarket(serialized);

  return <MarketDetailClient market={market} />;
}

