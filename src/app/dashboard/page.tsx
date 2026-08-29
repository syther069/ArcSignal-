import DashboardClient from './DashboardClient';
import { serializeMarket, type SerializableMarket } from '@/lib/markets';
import { getIndexedMarkets } from '@/lib/indexed-markets';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let markets: SerializableMarket[] = [];
  const aiAccuracy: never[] = [];

  try {
    markets = (await getIndexedMarkets(160, 0)).map(serializeMarket);
  } catch (error) {
    console.error('Dashboard market index unavailable:', error);
  }

  return <DashboardClient markets={markets} aiAccuracy={aiAccuracy} />;
}
