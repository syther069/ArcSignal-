import { getRecentStakes } from '@/lib/frontend-data';
import FeedClient from './FeedClient';
import { Stake } from '@/types';

export const revalidate = 10;

export default async function FeedPage() {
  let initialStakes: Stake[] = [];

  try {
    initialStakes = await getRecentStakes(100);
  } catch (error) {
    console.error('Failed to fetch recent stakes:', error);
  }

  return <FeedClient initialStakes={initialStakes} />;
}
