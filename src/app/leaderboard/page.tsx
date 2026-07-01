import LeaderboardClient from './LeaderboardClient';
import { LeaderboardEntry } from '@/types';

export const revalidate = 60;

export default async function LeaderboardPage() {
  let initialLeaderboard: LeaderboardEntry[] = [];

  try {
    // Leaderboard data coming soon
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
  }

  return <LeaderboardClient initialLeaderboard={initialLeaderboard} />;
}
