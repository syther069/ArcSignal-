export type MarketCategory = 'CRYPTO' | 'FOOTBALL';
export type MarketOutcome = 'FOLLOW' | 'FADE' | 'CANCELLED' | 'PENDING';

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

export interface MarketMeta {
  id: number;
  question: string;
  category: MarketCategory;
  subType: string;
  resolutionTime: number;
  analysis: AIAnalysis;
}

export interface OnChainMarket {
  id: number;
  followPool: bigint;
  fadePool: bigint;
  resolved: boolean;
  outcome: 0 | 1 | 2;
}

export interface Market extends MarketMeta {
  followPool: bigint;
  fadePool: bigint;
  resolved: boolean;
  outcome: MarketOutcome;
}

export interface UserPosition {
  marketId: number;
  side: 'FOLLOW' | 'FADE';
  amount: bigint;
  claimed: boolean;
}
