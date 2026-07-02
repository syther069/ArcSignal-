import DashboardClient from './DashboardClient';
import { getMarketsFromChain, serializeMarket, type SerializableMarket } from '@/lib/markets';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let markets: SerializableMarket[] = [];
  let aiAccuracy: any[] = [];
  try {
    const chainMarkets = await getMarketsFromChain();
    markets = chainMarkets.map(serializeMarket);
  } catch {
    markets = [];
  }

  return <DashboardClient markets={markets} aiAccuracy={aiAccuracy} />;
}
