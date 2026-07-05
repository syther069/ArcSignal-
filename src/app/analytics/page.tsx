import AnalyticsClient from './AnalyticsClient';
import { getMarketsFromChain, serializeMarket } from '@/lib/markets';
import { toUiMarket } from '@/lib/ui-market';
import { publicClient, ARCSIGNAL_ADDRESS, ARCSIGNAL_ABI } from '@/lib/contracts';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  let markets: any[] = [];

  try {
    const chainMarkets = await getMarketsFromChain();
    markets = chainMarkets.map(serializeMarket).map(toUiMarket);
  } catch {
    markets = [];
  }

  // ─── Fetch ALL Staked events from chain ────────────────────────────────────
  let stakedLogs: any[] = [];
  try {
    stakedLogs = await publicClient.getLogs({
      address: ARCSIGNAL_ADDRESS,
      event: ARCSIGNAL_ABI.find((x: any) => x.type === 'event' && x.name === 'Staked') as any,
      fromBlock: 0n,
      toBlock: 'latest',
    }) as any[];
  } catch {
    stakedLogs = [];
  }

  // ─── Volume Over Time (last 7 days from block timestamps) ─────────────────
  const volumeByDayMap: Record<string, number> = {};

  // Fetch block timestamps for each log in parallel (batched to avoid rate limits)
  const blockTimestamps: Record<string, number> = {};
  const uniqueBlocks = Array.from(new Set(stakedLogs.map((l: any) => l.blockNumber)));
  await Promise.all(
    uniqueBlocks.map(async (bn) => {
      try {
        const block = await publicClient.getBlock({ blockNumber: bn as bigint });
        blockTimestamps[bn!.toString()] = Number(block.timestamp);
      } catch {
        blockTimestamps[bn!.toString()] = Date.now() / 1000;
      }
    })
  );

  stakedLogs.forEach((log: any) => {
    const ts = blockTimestamps[log.blockNumber!.toString()] ?? Date.now() / 1000;
    const date = new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const amountUsdc = Number(log.args.amount) / 1e6;
    volumeByDayMap[date] = (volumeByDayMap[date] || 0) + amountUsdc;
  });

  const volumeData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    volumeData.push({ date: dateStr, volume: volumeByDayMap[dateStr] || 0 });
  }

  // ─── Follow vs Fade Ratio from real pool data ──────────────────────────────
  let totalFollow = 0;
  let totalFade = 0;
  markets.forEach((m: any) => {
    totalFollow += Number(m.followPool) / 1e6;
    totalFade += Number(m.fadePool) / 1e6;
  });

  const ratioData = [
    { name: 'Follow AI', value: totalFollow, color: '#34d399' },
    { name: 'Fade AI',   value: totalFade,   color: '#f87171' },
  ];

  // ─── Top Markets by Volume ─────────────────────────────────────────────────
  const topMarketsData = [...markets]
    .sort((a: any, b: any) => (Number(b.followPool) + Number(b.fadePool)) - (Number(a.followPool) + Number(a.fadePool)))
    .slice(0, 5)
    .map((m: any) => ({
      name: m.title?.length > 20 ? m.title.substring(0, 20) + '...' : (m.title || m.question?.substring(0, 20) + '...' || 'Market'),
      volume: (Number(m.followPool) + Number(m.fadePool)) / 1e6,
    }));

  // ─── Aggregate Stats ───────────────────────────────────────────────────────
  const totalVolume = totalFollow + totalFade;
  const totalStakedUsdc = stakedLogs.reduce((acc: number, l: any) => acc + Number(l.args.amount) / 1e6, 0);
  const avgConfidence = markets.length > 0
    ? Math.round(markets.reduce((acc: number, m: any) => acc + (m.confidence || 0), 0) / markets.length)
    : 0;

  // ─── AI Win Rates from resolved markets ───────────────────────────────────
  const resolvedMarkets = markets.filter((m: any) => m.resolved);
  const footballMarkets = resolvedMarkets.filter((m: any) => m.category === 'football' || m.category === 'FOOTBALL');
  const cryptoMarkets   = resolvedMarkets.filter((m: any) => m.category === 'crypto'   || m.category === 'CRYPTO');

  // outcome 1 = follow wins (AI correct), outcome 2 = fade wins (AI wrong)
  const footballCorrect = footballMarkets.filter((m: any) => m.outcome === 'FOLLOW' || m.outcome === 1).length;
  const cryptoCorrect   = cryptoMarkets.filter((m: any) => m.outcome === 'FOLLOW' || m.outcome === 1).length;

  const agentWinRates = [
    { category: 'Football', rate: footballMarkets.length > 0 ? Math.round((footballCorrect / footballMarkets.length) * 100) : 0 },
    { category: 'Crypto',   rate: cryptoMarkets.length   > 0 ? Math.round((cryptoCorrect   / cryptoMarkets.length)   * 100) : 0 },
  ];

  const pendingCount   = markets.filter((m: any) => !m.resolved).length;
  const resolvedCount  = resolvedMarkets.length;
  const followPercent  = totalVolume > 0 ? Math.round((totalFollow / totalVolume) * 100) : 0;
  const fadePercent    = totalVolume > 0 ? Math.round((totalFade   / totalVolume) * 100) : 0;

  return (
    <AnalyticsClient
      agentWinRates={agentWinRates}
      volumeData={volumeData}
      ratioData={ratioData}
      topMarketsData={topMarketsData}
      stats={{
        totalVolume,
        totalStakedUsdc,
        avgConfidence,
        activeMarkets: pendingCount,
        totalStakes: stakedLogs.length,
        totalMarkets: markets.length,
        pendingCount,
        resolvedCount,
        followPercent,
        fadePercent,
        aiAccuracy: agentWinRates[1]?.rate ?? 0,
      }}
      resolvedMarkets={resolvedMarkets}
      markets={markets}
    />
  );
}
