import LeaderboardClient from './LeaderboardClient';
import { getMarketsFromChain, serializeMarket } from '@/lib/markets';
import { publicClient, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import { parseAbiItem } from 'viem';
import { getIndexedLeaderboard } from '@/lib/indexed-leaderboard';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  let markets: any[] = [];
  let leaderboard: Array<{
    address: string;
    totalStaked: bigint | string;
    correctPredictions: number;
    totalPredictions: number;
    winRate: number;
    totalPayout: string;
    resolvedStaked: string;
    netPnl: number;
    roi: number;
  }> = [];

  try {
    const chainMarkets = await getMarketsFromChain();
    markets = chainMarkets.map(serializeMarket);

    const DEPLOYMENT_BLOCK = 50012000n;

    const stakedLogs = await publicClient.getLogs({
      address: ARCSIGNAL_ADDRESS,
      event: parseAbiItem('event Staked(string marketId, address user, uint8 side, uint256 amount)'),
      fromBlock: DEPLOYMENT_BLOCK,
      toBlock: 'latest',
    });

    const addressMap = new Map<string, { totalStaked: bigint; correct: number; total: number }>();
    
    for (const log of stakedLogs) {
      const { user, amount, marketId, side } = log.args as { user: string; amount: bigint; marketId: string; side: any };
      if (!user) continue;
      const userKey = user.toLowerCase();
      if (!addressMap.has(userKey)) {
        addressMap.set(userKey, { totalStaked: 0n, correct: 0, total: 0 });
      }
      const entry = addressMap.get(userKey)!;
      entry.totalStaked += BigInt(amount || 0n);
      
      const market = markets.find((m: any) => m.marketId === marketId);
      // outcome: 0 = unresolved, 1 = follow wins, 2 = fade wins
      // side:    0 = follow,     1 = fade
      if (market && market.resolved) {
        const rawOutcome = Number(market.outcome === 'FOLLOW' ? 1 : market.outcome === 'FADE' ? 2 : 0);
        if (rawOutcome !== 0) {
          entry.total += 1;
          const winningSide = rawOutcome === 1 ? 0 : 1; // outcome 1 → follow(0) wins, outcome 2 → fade(1) wins
          if (Number(side) === winningSide) entry.correct += 1;
        }
      }
    }

    leaderboard = Array.from(addressMap.entries())
      .map(([address, data]) => ({
        address,
        totalStaked: data.totalStaked,
        correctPredictions: data.correct,
        totalPredictions: data.total,
        winRate: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        totalPayout: '0',
        resolvedStaked: data.totalStaked.toString(),
        netPnl: 0,
        roi: 0,
      }))
      // Sort: first by win rate desc (only for those who have resolved predictions), then by totalStaked desc
      .sort((a, b) => {
        if (a.totalPredictions > 0 && b.totalPredictions > 0) {
          if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        }
        return b.totalStaked > a.totalStaked ? -1 : b.totalStaked < a.totalStaked ? 1 : 0;
      })
      .slice(0, 20);
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    leaderboard = [];
  }

  // Prefer the database read model for ranking. It aggregates one row per
  // wallet/market, so repeated top-ups do not inflate prediction counts.
  try {
    const indexedLeaderboard = await getIndexedLeaderboard(100);
    if (indexedLeaderboard.length > 0) leaderboard = indexedLeaderboard;
  } catch (error) {
    console.warn('Indexed leaderboard unavailable; using chain fallback.', error);
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
