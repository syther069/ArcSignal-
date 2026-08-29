import MarketDetailClient from './MarketDetailClient';
import { getSingleMarketFromChain, serializeMarket } from '@/lib/markets';
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
  let rawMarket = await getIndexedMarketById(id).catch((error) => {
    console.warn('Market index unavailable; reading market from ARC chain:', error);
    return null;
  });

  if (!rawMarket) {
    rawMarket = await getSingleMarketFromChain(id);
  }

  if (!rawMarket) {
    notFound();
  }

  const serialized = serializeMarket(rawMarket);
  const market = toUiMarket(serialized);

  return <MarketDetailClient market={market} />;
}

