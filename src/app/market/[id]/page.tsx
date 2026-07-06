import MarketDetailClient from './MarketDetailClient';
import { getMarketsFromChain, serializeMarket } from '@/lib/markets';
import { toUiMarket } from '@/lib/ui-market';
import { notFound } from 'next/navigation';

export default async function MarketDetailPage({ params }: { params: { id: string } }) {
  const markets = await getMarketsFromChain();
  const rawMarket = markets.find((m) => m.marketId === params.id);
  
  if (!rawMarket) {
    notFound();
  }

  const serialized = serializeMarket(rawMarket);
  const market = toUiMarket(serialized);

  return <MarketDetailClient market={market} />;
}
