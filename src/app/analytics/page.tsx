import AnalyticsClient from './AnalyticsClient';
import { getMarketsFromChain, serializeMarket } from '@/lib/markets';
import { toUiMarket } from '@/lib/ui-market';
import { publicClient, ARCSIGNAL_ADDRESS, ARCSIGNAL_ABI } from '@/lib/contracts';
import { getIndexedAnalytics } from '@/lib/indexed-analytics';

export const dynamic = 'force-dynamic';

function withAccuracySeries(markets: any[]) {
  let cryptoResolved = 0;
  let cryptoCorrect = 0;
  let footballResolved = 0;
  let footballCorrect = 0;

  return markets.map((market) => {
    const isCrypto = String(market.category).toUpperCase() === 'CRYPTO';
    const isFootball = String(market.category).toUpperCase() === 'FOOTBALL';
    if (isCrypto) {
      cryptoResolved++;
      if (market.outcome === 'FOLLOW' || market.outcome === 1) cryptoCorrect++;
    }
    if (isFootball) {
      footballResolved++;
      if (market.outcome === 'FOLLOW' || market.outcome === 1) footballCorrect++;
    }
    return {
      ...market,
      resolutionDate: new Date(Number(market.resolutionTime) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      cryptoAccuracy: isCrypto && cryptoResolved ? Math.round((cryptoCorrect / cryptoResolved) * 100) : null,
      footballAccuracy: isFootball && footballResolved ? Math.round((footballCorrect / footballResolved) * 100) : null,
    };
  });
}

export default async function AnalyticsPage() {
  try {
    const indexed = await getIndexedAnalytics();
    if (indexed) {
      return <AnalyticsClient {...indexed} />;
    }
  } catch (error) {
    console.warn('Indexed analytics unavailable; using chain fallback.', error);
  }

  let markets: any[] = [];

  try {
    const chainMarkets = await getMarketsFromChain();
    markets = chainMarkets.map(serializeMarket).map(toUiMarket).map((market: any) => ({
      ...market,
      followPool: Number(market.followPool) / 1e6,
      fadePool: Number(market.fadePool) / 1e6,
    }));
  } catch {
    markets = [];
  }

  // ─── Fetch Recent Staked events for the chart ──────────────────────────────
  let stakedLogs: any[] = [];
  try {
    const DEPLOYMENT_BLOCK = 50012000n;
    stakedLogs = await publicClient.getLogs({
      address: ARCSIGNAL_ADDRESS,
      event: ARCSIGNAL_ABI.find((x: any) => x.type === 'event' && x.name === 'Staked') as any,
      fromBlock: DEPLOYMENT_BLOCK,
      toBlock: 'latest',
    }) as any[];
  } catch (err) {
    console.error('Failed to fetch logs:', err);
    stakedLogs = [];
  }

  // ─── Volume Over Time (last 7 days from block timestamps) ─────────────────
  const volumeByDayMap: Record<string, number> = {};

  // Fetch ONLY the latest block to calculate approximate timestamps
  let currentBlockTimestamp = Date.now() / 1000;
  let currentBlockNumber = 0n;
  try {
    const latest = await publicClient.getBlock({ blockTag: 'latest' });
    currentBlockTimestamp = Number(latest.timestamp);
    currentBlockNumber = latest.number || 0n;
  } catch (err) {
    console.error('Failed to fetch latest block:', err);
  }

  stakedLogs.forEach((log: any) => {
    // Arc Testnet block time is ~2 seconds.
    const blocksAgo = Number(currentBlockNumber) - Number(log.blockNumber || currentBlockNumber);
    const ts = currentBlockTimestamp - (blocksAgo * 2);
    
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
    totalFollow += Number(m.followPool);
    totalFade += Number(m.fadePool);
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
      volume: Number(m.followPool) + Number(m.fadePool),
    }));

  // ─── Aggregate Stats ───────────────────────────────────────────────────────
  const totalVolume = totalFollow + totalFade;
  // totalStakedUsdc from logs can be missing pruned data, use totalVolume as ground truth for accurate stats
  const totalStakedUsdc = totalVolume > 0 ? totalVolume : 
    (stakedLogs.length > 0 ? stakedLogs.reduce((acc: number, l: any) => acc + Number(l.args.amount) / 1e6, 0) : 0);
  
  const avgConfidence = markets.length > 0
    ? Math.round(markets.reduce((acc: number, m: any) => acc + (m.confidence || 0), 0) / markets.length)
    : 0;

  // ─── AI Win Rates from resolved markets ───────────────────────────────────
  const resolvedMarkets = withAccuracySeries(markets.filter((m: any) => m.resolved));
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
  const cancelledCount = resolvedMarkets.filter((m: any) => m.outcome === 'CANCELLED' || m.outcome === 0).length;
  const averageLiquidity = markets.length ? totalVolume / markets.length : 0;
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
        aiAccuracy: resolvedCount > cancelledCount
          ? Math.round((resolvedMarkets.filter((m: any) => m.outcome === 'FOLLOW' || m.outcome === 1).length / (resolvedCount - cancelledCount)) * 100)
          : null,
        cancelledCount,
        averageLiquidity,
        dataAsOf: new Date().toISOString(),
        dataSource: 'ARC RPC FALLBACK',
      }}
      resolvedMarkets={resolvedMarkets}
      markets={markets}
    />
  );
}
