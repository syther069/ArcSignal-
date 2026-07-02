import AnalyticsClient from './AnalyticsClient';
import { Market, Stake } from '@/types';
import { getMarketsFromChain, serializeMarket } from '@/lib/markets';
import { toUiMarket } from '@/lib/ui-market';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  let markets: Market[] = [];
  let stakes: Stake[] = [];

  try {
    const chainMarkets = await getMarketsFromChain();
    markets = chainMarkets.map(serializeMarket).map(toUiMarket);
  } catch {
    markets = [];
  }

  // Staking Volume Over Time (grouping real stakes by day)
  const volumeByDayMap: Record<string, number> = {};
  stakes.forEach(s => {
    const date = new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    volumeByDayMap[date] = (volumeByDayMap[date] || 0) + s.amountUsdc;
  });

  const volumeData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    volumeData.push({ date: dateStr, volume: volumeByDayMap[dateStr] || 0 });
  }

  // Follow vs Fade Ratio from real pool data
  let totalFollow = 0;
  let totalFade = 0;
  markets.forEach(m => {
    totalFollow += m.followPool;
    totalFade += m.fadePool;
  });

  const ratioData = [
    { name: 'Follow AI', value: totalFollow, color: '#34d399' },
    { name: 'Fade AI', value: totalFade, color: '#f87171' },
  ];

  // Top Markets by Volume (real data only)
  const topMarketsData = [...markets]
    .sort((a, b) => (b.followPool + b.fadePool) - (a.followPool + a.fadePool))
    .slice(0, 5)
    .map(m => ({
      name: m.title.length > 20 ? m.title.substring(0, 20) + '...' : m.title,
      volume: m.followPool + m.fadePool,
    }));

  const totalVolume = totalFollow + totalFade;
  const avgConfidence = markets.length > 0
    ? Math.round(markets.reduce((acc, m) => acc + (m.confidence || 0), 0) / markets.length)
    : 0;

  // AI win rates computed from resolved markets (actual data)
  const footballMarkets = markets.filter(m => m.category === 'football' && m.resolved);
  const cryptoMarkets = markets.filter(m => m.category === 'crypto' && m.resolved);
  const agentWinRates = [
    { category: 'Football', rate: footballMarkets.length > 0 ? Math.round((footballMarkets.filter(m => m.outcome?.includes('Correct')).length / footballMarkets.length) * 100) : 0 },
    { category: 'Crypto', rate: cryptoMarkets.length > 0 ? Math.round((cryptoMarkets.filter(m => m.outcome?.includes('Correct')).length / cryptoMarkets.length) * 100) : 0 },
  ];

  return (
    <AnalyticsClient
      agentWinRates={agentWinRates}
      volumeData={volumeData}
      ratioData={ratioData}
      topMarketsData={topMarketsData}
      stats={{ totalVolume, avgConfidence, activeMarkets: markets.length, totalStakes: stakes.length }}
    />
  );
}
