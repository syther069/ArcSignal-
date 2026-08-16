import MarketsClient from './MarketsClient';
import { getMarketsFromChain, serializeMarket, type SerializableMarket } from '@/lib/markets';
import { getIndexedMarkets } from '@/lib/indexed-markets';

export const dynamic = 'force-dynamic';

const CHAIN_FALLBACK_LIMIT = 24;

export default async function MarketsPage() {
  let markets: SerializableMarket[] = [];
  try {
    let chainMarkets;
    try {
      const indexedMarkets = await getIndexedMarkets(160, 0);
      chainMarkets = indexedMarkets.length > 0
        ? indexedMarkets
        : await getMarketsFromChain(false, { limit: CHAIN_FALLBACK_LIMIT, offset: 0 });
    } catch (indexError) {
      console.warn('Markets index unavailable; falling back to chain:', indexError);
      chainMarkets = await getMarketsFromChain(false, { limit: CHAIN_FALLBACK_LIMIT, offset: 0 });
    }
    // Keep all on-chain markets visible, including resolved markets. Their
    // explicit status is derived in getMarketsFromChain and rendered by the UI.
    markets = chainMarkets.map(serializeMarket);
  } catch (error) {
    console.error("Error fetching markets from chain:", error);
    markets = [];
  }

  return <MarketsClient markets={markets} />;
}
