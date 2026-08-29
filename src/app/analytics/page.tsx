import nextDynamic from 'next/dynamic';
import DataUnavailable from '@/components/DataUnavailable';
import { buildMarketAnalytics } from '@/lib/market-analytics';
import { getMarketSnapshot } from '@/lib/market-source';

const AnalyticsClient = nextDynamic(() => import('./AnalyticsClient'), {
  loading: () => <div className="min-h-screen bg-background" aria-busy="true" />,
});

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const analytics = await getMarketSnapshot(160, 0)
    .then(buildMarketAnalytics)
    .catch((error) => {
      console.error('Analytics data unavailable:', error);
      return null;
    });

  if (!analytics) {
    return <DataUnavailable />;
  }

  return <AnalyticsClient {...analytics} />;
}