export type MarketCategory = 'CRYPTO' | 'FOOTBALL';
export type MarketOutcome = 'FOLLOW' | 'FADE' | 'PENDING' | 'CANCELLED';

export interface AIAnalysis {
  probability: number;
  confidence: number;
  prediction: 'YES' | 'NO';
  summary: string;
  bullCase: string;
  bearCase: string;
  keyFactors: string[];
  riskFactors: string[];
  sources: string[];
  generatedAt: string;
}

export interface Market {
  marketId: string;
  category: MarketCategory;
  resolutionTime: number;
  followPool: bigint;
  fadePool: bigint;
  resolved: boolean;
  outcome: MarketOutcome;
  // AI analysis stored in memory cache, not on-chain
  analysis?: AIAnalysis;
  question?: string;
}

export interface SerializableMarket extends Omit<Market, 'followPool' | 'fadePool'> {
  followPool: string;
  fadePool: string;
}

export interface UserPosition {
  marketId: string;
  followStake: bigint;
  fadeStake: bigint;
  claimed: boolean;
}
