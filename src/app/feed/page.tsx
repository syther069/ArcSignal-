import FeedClient from './FeedClient';
import { Stake } from '@/types';
import { serializeMarket, type SerializableMarket } from '@/lib/markets';
import { getIndexedMarkets } from '@/lib/indexed-markets';

export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  const initialStakes: Stake[] = [];
  let markets: SerializableMarket[] = [];

  try {
    markets = (await getIndexedMarkets(160, 0)).map(serializeMarket);
  } catch (error) {
    console.error('Feed market index unavailable:', error);
  }

  return <FeedClient initialStakes={initialStakes} markets={markets} />;
}
