import { getOpenMarkets } from '@/lib/frontend-data';
import MarketsClient from './MarketsClient';
import { Market } from '@/types';

export const revalidate = 60;

export default async function MarketsPage() {
  let initialMarkets: Market[] = [];
  try {
    initialMarkets = await getOpenMarkets();
  } catch (error) {
    console.error('Failed to fetch markets:', error);
  }

  return <MarketsClient initialMarkets={initialMarkets} />;
}
