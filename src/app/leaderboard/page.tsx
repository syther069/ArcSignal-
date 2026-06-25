import { getLeaderboard } from '@/lib/frontend-data';
import LeaderboardClient from './LeaderboardClient';
import { LeaderboardEntry } from '@/types';

export const revalidate = 60;

export default async function LeaderboardPage() {
  let initialLeaderboard: LeaderboardEntry[] = [];

  try {
    initialLeaderboard = await getLeaderboard('profit', 50);
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
  }

  return <LeaderboardClient initialLeaderboard={initialLeaderboard} />;
}
