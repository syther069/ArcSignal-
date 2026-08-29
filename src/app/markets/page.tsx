import MarketsClient from './MarketsClient';
import { serializeMarket, type SerializableMarket } from '@/lib/markets';
import { getIndexedMarkets } from '@/lib/indexed-markets';

export const dynamic = 'force-dynamic';

export default async function MarketsPage() {
  let markets: SerializableMarket[] = [];

  try {
    markets = (await getIndexedMarkets(160, 0)).map(serializeMarket);
  } catch (error) {
    console.error('Markets index unavailable:', error);
  }

  return <MarketsClient markets={markets} />;
}
