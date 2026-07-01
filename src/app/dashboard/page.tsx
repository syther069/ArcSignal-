import DashboardClient from './DashboardClient';
import { Market } from '@/types';

export const revalidate = 60;

export default async function DashboardPage() {
  let initialMarkets: Market[] = [];
  let aiAccuracy: any[] = [];
  try {
    const res = await fetch('http://localhost:3000/api/markets', { cache: 'no-store' });
    const data = await res.json();
    initialMarkets = data.markets || [];
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
  }

  return <DashboardClient initialMarkets={initialMarkets} aiAccuracy={aiAccuracy} />;
}
