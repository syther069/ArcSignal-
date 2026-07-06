import LeaderboardClient from './LeaderboardClient';
import { getMarketsFromChain, serializeMarket } from '@/lib/markets';
import { publicClient, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import { parseAbiItem } from 'viem';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  let markets: any[] = [];
  let leaderboard: Array<{
    address: string;
    totalStaked: bigint;
    correctPredictions: number;
    totalPredictions: number;
    winRate: number;
  }> = [];

  try {
    const chainMarkets = await getMarketsFromChain();
    markets = chainMarkets.map(serializeMarket);

    const fromBlock = 0n; // Fetch all historical stakes

    const stakedLogs = await publicClient.getLogs({
      address: ARCSIGNAL_ADDRESS,
      event: parseAbiItem('event Staked(string marketId, address user, uint8 side, uint256 amount)'),
      fromBlock,
      toBlock: 'latest',
    });

    const addressMap = new Map<string, { totalStaked: bigint; correct: number; total: number }>();
    
    for (const log of stakedLogs) {
      const { user, amount, marketId, side } = log.args as { user: string; amount: bigint; marketId: string; side: number };
      if (!addressMap.has(user)) {
        addressMap.set(user, { totalStaked: 0n, correct: 0, total: 0 });
      }
      const entry = addressMap.get(user)!;
      entry.totalStaked += amount;
      
      const market = markets.find((m: any) => m.marketId === marketId);
      // outcome: 0 = unresolved, 1 = follow wins, 2 = fade wins
      // side:    0 = follow,     1 = fade
      if (market && market.resolved) {
        const rawOutcome = Number(market.outcome === 'FOLLOW' ? 1 : market.outcome === 'FADE' ? 2 : 0);
        if (rawOutcome !== 0) {
          entry.total += 1;
          const winningSide = rawOutcome === 1 ? 0 : 1; // outcome 1 → follow(0) wins, outcome 2 → fade(1) wins
          if (side === winningSide) entry.correct += 1;
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
      }))
      // Sort: first by win rate desc (only for those who have resolved predictions), then by totalStaked desc
      .sort((a, b) => {
        if (a.totalPredictions > 0 && b.totalPredictions > 0) {
          if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        }
        return b.totalStaked > a.totalStaked ? 1 : -1;
      })
      .slice(0, 20);
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    leaderboard = [];
  }

  return <LeaderboardClient leaderboard={leaderboard} markets={markets} />;
}
