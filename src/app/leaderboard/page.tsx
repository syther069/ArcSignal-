import LeaderboardClient from './LeaderboardClient';
import DataUnavailable from '@/components/DataUnavailable';
import { serializeMarket } from '@/lib/markets';
import { getIndexedMarkets } from '@/lib/indexed-markets';
import { getIndexedLeaderboard } from '@/lib/indexed-leaderboard';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const result = await Promise.all([
      getIndexedLeaderboard(100),
      getIndexedMarkets(160, 0),
    ])
    .catch((error) => {
      console.error('Leaderboard index unavailable:', error);
      return null;
    });

  if (!result) {
    return <DataUnavailable />;
  }

  const [leaderboard, rawMarkets] = result;
  const markets = rawMarkets.map(serializeMarket);

  const serializableLeaderboard = leaderboard.map((entry) => ({
    address: entry.address,
    totalStaked: String(entry.totalStaked),
    correctPredictions: entry.correctPredictions,
    totalPredictions: entry.totalPredictions,
    winRate: entry.winRate,
    totalPayout: String(entry.totalPayout ?? '0'),
    resolvedStaked: String(entry.resolvedStaked ?? '0'),
    netPnl: Number(entry.netPnl ?? 0),
    roi: Number(entry.roi ?? 0),
  }));

  return <LeaderboardClient leaderboard={serializableLeaderboard} markets={markets} />;
}
