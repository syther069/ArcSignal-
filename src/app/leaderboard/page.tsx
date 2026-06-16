import { getLeaderboard } from '@/lib/supabase';
import LeaderboardClient from './LeaderboardClient';
import { LeaderboardEntry } from '@/types';

// Demo data for fallback
const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    walletAddress: '0x1A2b...8C9d',
    username: 'NeuralWhale',
    totalStaked: 1450000,
    winRate: 72.5,
    netProfit: 345000,
    marketsEntered: 142,
  },
  {
    rank: 2,
    walletAddress: '0x9F8e...7D6c',
    username: 'AlphaAgent007',
    totalStaked: 890000,
    winRate: 68.2,
    netProfit: 195000,
    marketsEntered: 89,
  },
  {
    rank: 3,
    walletAddress: '0x5B4a...3C2b',
    totalStaked: 1200000,
    winRate: 64.8,
    netProfit: 142000,
    marketsEntered: 210,
  },
  {
    rank: 4,
    walletAddress: '0x8C7d...6E5f',
    username: 'DegenAI',
    totalStaked: 450000,
    winRate: 59.1,
    netProfit: 85000,
    marketsEntered: 45,
  },
  {
    rank: 5,
    walletAddress: '0x2D3e...4F5g',
    totalStaked: 670000,
    winRate: 61.4,
    netProfit: 72000,
    marketsEntered: 112,
  },
  {
    rank: 6,
    walletAddress: '0x1111...2222',
    username: 'QuantTrader',
    totalStaked: 320000,
    winRate: 66.7,
    netProfit: 64000,
    marketsEntered: 30,
  },
  {
    rank: 7,
    walletAddress: '0x3333...4444',
    totalStaked: 890000,
    winRate: 54.2,
    netProfit: 45000,
    marketsEntered: 156,
  },
];

export const revalidate = 60;

export default async function LeaderboardPage() {
  let initialLeaderboard: LeaderboardEntry[] = [];
  
  try {
    initialLeaderboard = await getLeaderboard('profit', 50);
  } catch (error) {
    console.error('Failed to fetch leaderboard', error);
  }

  if (!initialLeaderboard || initialLeaderboard.length === 0) {
    initialLeaderboard = DEMO_LEADERBOARD;
  }

  return <LeaderboardClient initialLeaderboard={initialLeaderboard} />;
}
