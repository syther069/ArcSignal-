import FeedClient from './FeedClient';
import { Stake } from '@/types';

export const revalidate = 10;

export default async function FeedPage() {
  let initialStakes: Stake[] = [];

  try {
    // Stakes API not yet available, leaving empty
  } catch (error) {
    console.error('Failed to fetch recent stakes:', error);
  }

  return <FeedClient initialStakes={initialStakes} />;
}
