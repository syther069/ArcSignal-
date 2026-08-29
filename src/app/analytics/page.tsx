import nextDynamic from 'next/dynamic';
import { getIndexedAnalytics } from '@/lib/indexed-analytics';

const AnalyticsClient = nextDynamic(() => import('./AnalyticsClient'), {
  loading: () => <div className="min-h-screen bg-background" aria-busy="true" />,
});

export const dynamic = 'force-dynamic';

const EMPTY_ANALYTICS = {
  agentWinRates: [
    { category: 'Football', rate: 0 },
    { category: 'Crypto', rate: 0 },
  ],
  volumeData: [],
  ratioData: [
    { name: 'Follow AI', value: 0, color: '#34d399' },
    { name: 'Fade AI', value: 0, color: '#f87171' },
  ],
  topMarketsData: [],
  stats: {
    totalVolume: 0,
    totalStakedUsdc: 0,
    avgConfidence: 0,
    activeMarkets: 0,
    totalStakes: 0,
    totalMarkets: 0,
    pendingCount: 0,
    resolvedCount: 0,
    cancelledCount: 0,
    averageLiquidity: 0,
    dataAsOf: undefined,
    dataSource: 'INDEX UNAVAILABLE',
    followPercent: 0,
    fadePercent: 0,
    aiAccuracy: null,
  },
  resolvedMarkets: [],
  markets: [],
};

export default async function AnalyticsPage() {
  try {
    const indexed = await getIndexedAnalytics();
    return <AnalyticsClient {...(indexed ?? EMPTY_ANALYTICS)} />;
  } catch (error) {
    console.error('Analytics index unavailable:', error);
    return <AnalyticsClient {...EMPTY_ANALYTICS} />;
  }
}