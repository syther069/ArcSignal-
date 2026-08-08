import MarketsClient from './MarketsClient';
import { getMarketsFromChain, serializeMarket, type SerializableMarket } from '@/lib/markets';

export const dynamic = 'force-dynamic';

export default async function MarketsPage() {
  let markets: SerializableMarket[] = [];
  try {
    const chainMarkets = await getMarketsFromChain();
    // Keep all on-chain markets visible, including resolved markets. Their
    // explicit status is derived in getMarketsFromChain and rendered by the UI.
    markets = chainMarkets.map(serializeMarket);
  } catch (error) {
    console.error("Error fetching markets from chain:", error);
    markets = [];
  }

  return <MarketsClient markets={markets} />;
}
