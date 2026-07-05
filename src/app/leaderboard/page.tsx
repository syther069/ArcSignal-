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

    const stakedLogs = await publicClient.getLogs({
      address: ARCSIGNAL_ADDRESS,
      event: parseAbiItem('event Staked(string marketId, address user, uint8 side, uint256 amount)'),
      fromBlock: 0n,
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
      
      const market = markets.find(m => m.marketId === marketId);
      if (market && market.outcome !== 'PENDING') {
        entry.total += 1;
        const userSide = side === 0 ? 'FOLLOW' : 'FADE';
        if (market.outcome === userSide) entry.correct += 1;
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
      .sort((a, b) => (b.totalStaked > a.totalStaked ? 1 : -1))
      .slice(0, 20);
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    leaderboard = [];
  }

  return <LeaderboardClient leaderboard={leaderboard} markets={markets} />;
}
