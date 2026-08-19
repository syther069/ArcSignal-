import MarketDetailClient from './MarketDetailClient';
import { getSingleMarketFromChain, serializeMarket } from '@/lib/markets';
import { getIndexedMarketById } from '@/lib/indexed-markets';
import { toUiMarket } from '@/lib/ui-market';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MarketDetailPage({ params }: { params: { id: string } }) {
  let rawMarket = null;

  try {
    rawMarket = await getIndexedMarketById(params.id);
  } catch (err) {
    console.warn(`Market index read failed for ${params.id}, falling back to chain:`, err);
  }

  if (!rawMarket) {
    rawMarket = await getSingleMarketFromChain(params.id);
  }

  if (!rawMarket) {
    notFound();
  }

  const serialized = serializeMarket(rawMarket);
  const market = toUiMarket(serialized);

  return <MarketDetailClient market={market} />;
}

