import { getOpenMarkets } from '@/lib/frontend-data';
import DashboardClient from './DashboardClient';
import { Market } from '@/types';

export const revalidate = 60;

export default async function DashboardPage() {
  let initialMarkets: Market[] = [];
  let aiAccuracy: any[] = [];
  try {
    initialMarkets = await getOpenMarkets();
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
  }

  return <DashboardClient initialMarkets={initialMarkets} aiAccuracy={aiAccuracy} />;
}
