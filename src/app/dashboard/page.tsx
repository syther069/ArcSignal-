import DashboardClient from './DashboardClient';
import DataUnavailable from '@/components/DataUnavailable';
import { serializeMarket } from '@/lib/markets';
import { getMarketSnapshot } from '@/lib/market-source';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const aiAccuracy: never[] = [];
  const markets = await getMarketSnapshot(160, 0)
    .then((snapshot) => snapshot.markets.map(serializeMarket))
    .catch((error) => {
      console.error('Dashboard market index unavailable:', error);
      return null;
    });

  if (!markets) {
    return <DataUnavailable />;
  }

  return <DashboardClient markets={markets} aiAccuracy={aiAccuracy} />;
}
