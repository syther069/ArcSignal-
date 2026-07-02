import MarketsClient from './MarketsClient';
import { getMarketsFromChain, serializeMarket, type SerializableMarket } from '@/lib/markets';

export const dynamic = 'force-dynamic';

export default async function MarketsPage() {
  let markets: SerializableMarket[] = [];
  try {
    const chainMarkets = await getMarketsFromChain();
    markets = chainMarkets.map(serializeMarket);
  } catch {
    markets = [];
  }

  return <MarketsClient markets={markets} />;
}
