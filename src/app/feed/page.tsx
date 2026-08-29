import FeedClient from './FeedClient';
import DataUnavailable from '@/components/DataUnavailable';
import { Stake } from '@/types';
import { serializeMarket } from '@/lib/markets';
import { getMarketSnapshot } from '@/lib/market-source';

export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  const initialStakes: Stake[] = [];
  const snapshot = await getMarketSnapshot(160, 0)
    .catch((error) => {
      console.error('Feed market data unavailable:', error);
      return null;
    });

  if (!snapshot) {
    return <DataUnavailable />;
  }

  return (
    <FeedClient
      initialStakes={initialStakes}
      markets={snapshot.markets.map(serializeMarket)}
      historyUnavailable={snapshot.source === 'arc-chain'}
    />
  );
}
