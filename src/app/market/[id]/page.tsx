import MarketDetailClient from './MarketDetailClient';
import { notFound } from 'next/navigation';
import { Market } from '@/types';
import { getMarketsFromChain, serializeMarket } from '@/lib/markets';
import { toUiMarket } from '@/lib/ui-market';



export const dynamic = 'force-dynamic';

export default async function MarketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let market: Market | null = null;
  
  try {
    const marketId = decodeURIComponent(params.id);
    const chainMarkets = await getMarketsFromChain();
    const markets = chainMarkets.map(serializeMarket);
    const chainMarket = markets.find((market) => market.id === marketId);
    market = chainMarket ? toUiMarket(chainMarket) : null;
  } catch {
    market = null;
  }

  if (!market) {
    notFound();
  }

  return <MarketDetailClient market={market} />;
}
