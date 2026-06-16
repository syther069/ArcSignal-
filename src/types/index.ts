export type MarketCategory = 'football' | 'crypto';
export type CryptoSubType = 'price' | 'listing' | 'onchain';
export type StakeSide = 0 | 1; // 0 = Follow, 1 = Fade

export interface Market {
  id: string;
  category: MarketCategory;
  subType?: CryptoSubType;
  title: string;
  description: string;
  agentPick: string;
  agentId: string;
  confidence: number;
  keyFactors: string[];
  followPool: number;
  fadePool: number;
  resolutionTime: number;
  resolved: boolean;
  outcome?: string;
  league?: string;
  homeTeam?: string;
  awayTeam?: string;
  homeScore?: number;
  awayScore?: number;
  createdAt: string;
}

export interface Stake {
  id: string;
  marketId: string;
  walletAddress: string;
  side: StakeSide;
  amountUsdc: number;
  txHash: string;
  outcome?: string;
  pnl?: number;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  username?: string;
  avatarUrl?: string;
  totalStaked: number;
  winRate: number;
  netProfit: number;
  marketsEntered: number;
}

export interface UserProfile {
  walletAddress: string;
  username: string;
  bio: string;
  avatarUrl: string;
  joinedAt: string;
  winRate: number;
  totalStaked: number;
  netProfit: number;
  marketsEntered: number;
  currentStreak: number;
  nftMinted: boolean;
}
