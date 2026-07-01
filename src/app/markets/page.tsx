import MarketsClient from './MarketsClient';
import { Market } from '@/types';

export const revalidate = 60;

export default async function MarketsPage() {
  let initialMarkets: Market[] = [];
  try {
    const res = await fetch('http://localhost:3000/api/markets', { cache: 'no-store' });
    const data = await res.json();
    initialMarkets = data.markets || [];
  } catch (error) {
    console.error('Failed to fetch markets:', error);
  }

  return <MarketsClient initialMarkets={initialMarkets} />;
}
