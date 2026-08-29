import FeedClient from './FeedClient';
import DataUnavailable from '@/components/DataUnavailable';
import { Stake } from '@/types';
import { serializeMarket } from '@/lib/markets';
import { getIndexedMarkets } from '@/lib/indexed-markets';

export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  const initialStakes: Stake[] = [];
  const markets = await getIndexedMarkets(160, 0)
    .then((result) => result.map(serializeMarket))
    .catch((error) => {
      console.error('Feed market index unavailable:', error);
      return null;
    });

  if (!markets) {
    return <DataUnavailable />;
  }

  return <FeedClient initialStakes={initialStakes} markets={markets} />;
}
