import FeedClient from './FeedClient';
import { Stake } from '@/types';
import { getMarketsFromChain, serializeMarket, type SerializableMarket } from '@/lib/markets';

export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  let initialStakes: Stake[] = [];
  let markets: SerializableMarket[] = [];

  try {
    const chainMarkets = await getMarketsFromChain();
    markets = chainMarkets.map(serializeMarket);
  } catch {
    markets = [];
  }

  return <FeedClient initialStakes={initialStakes} markets={markets} />;
}
