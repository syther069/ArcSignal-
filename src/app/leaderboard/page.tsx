import LeaderboardClient from './LeaderboardClient';
import DataUnavailable from '@/components/DataUnavailable';
import { serializeMarket } from '@/lib/markets';
import { getIndexedLeaderboard } from '@/lib/indexed-leaderboard';
import { getMarketSnapshot } from '@/lib/market-source';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const [leaderboardResult, marketResult] = await Promise.allSettled([
    getIndexedLeaderboard(100),
    getMarketSnapshot(160, 0),
  ]);

  if (marketResult.status === 'rejected') {
    console.error('Leaderboard market data unavailable:', marketResult.reason);
    return <DataUnavailable />;
  }

  const leaderboardUnavailable = leaderboardResult.status === 'rejected';
  if (leaderboardUnavailable) {
    console.error('Leaderboard index unavailable:', leaderboardResult.reason);
  }

  const leaderboard = leaderboardResult.status === 'fulfilled'
    ? leaderboardResult.value
    : [];
  const markets = marketResult.value.markets.map(serializeMarket);

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

  return (
    <LeaderboardClient
      leaderboard={serializableLeaderboard}
      markets={markets}
      dataUnavailable={leaderboardUnavailable}
    />
  );
}
