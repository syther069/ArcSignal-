import LeaderboardClient from './LeaderboardClient';
import { serializeMarket } from '@/lib/markets';
import { getIndexedMarkets } from '@/lib/indexed-markets';
import { getIndexedLeaderboard } from '@/lib/indexed-leaderboard';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const [leaderboardResult, marketsResult] = await Promise.allSettled([
    getIndexedLeaderboard(100),
    getIndexedMarkets(160, 0),
  ]);

  const leaderboard = leaderboardResult.status === 'fulfilled'
    ? leaderboardResult.value
    : [];
  const markets = marketsResult.status === 'fulfilled'
    ? marketsResult.value.map(serializeMarket)
    : [];

  if (leaderboardResult.status === 'rejected') {
    console.error('Leaderboard index unavailable:', leaderboardResult.reason);
  }
  if (marketsResult.status === 'rejected') {
    console.error('Leaderboard market stats unavailable:', marketsResult.reason);
  }

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
