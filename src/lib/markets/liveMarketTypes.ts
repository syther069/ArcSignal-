export type LiveMarketSource = 'internal' | 'polymarket' | 'kalshi' | 'manifold';
export type LiveMarketCategory = 'crypto' | 'politics' | 'technology' | 'economics';
export type LiveMarketSide = 'YES' | 'NO';
export type LiveMarketRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export type LiveMarketContextSource = {
  provider: 'gdelt' | 'fred' | 'coingecko' | 'github' | 'newsapi';
  label: string;
  url: string;
  status: 'available' | 'unavailable' | 'skipped';
  summary?: string;
};

export type ArcSignalLiveMarket = {
  id: string;
  source: LiveMarketSource;
  category: LiveMarketCategory;
  title: string;
  question: string;
  description?: string;
  outcomes: ['YES', 'NO'];
  marketProbability: number;
  yesPrice?: number;
  noPrice?: number;
  volume?: number;
  liquidity?: number;
  endDate?: string;
  resolutionDate?: string;
  resolutionSource?: string;
  sourceUrl: string;
  externalMarketId?: string;
  aiConfidence?: number;
  signalEdge?: number;
  aiSuggestedSide?: LiveMarketSide;
  aiSuggestedWager?: number;
  aiRiskLevel?: LiveMarketRisk;
  aiReason?: string;
  contextSources?: LiveMarketContextSource[];
  arcSettlement?: {
    marketId: string;
    marketAddress?: string;
    ammAddress?: string;
    status: string;
    sourceOutcome?: 'YES' | 'NO' | 'UNDETERMINED';
    sourceOutcomeObservedAt?: string;
    createTxHash?: string;
    errorMessage?: string;
  };
};

export type LiveMarketSourceStatus = {
  source: Exclude<LiveMarketSource, 'internal'>;
  ok: boolean;
  count: number;
  error?: string;
};

export type LiveMarketAggregatorResult = {
  markets: ArcSignalLiveMarket[];
  statuses: LiveMarketSourceStatus[];
  generatedAt: string;
  disclaimer: 'Live prediction market intelligence aggregated from external markets.';
};

