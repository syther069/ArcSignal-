export type MarketCategory = 'CRYPTO' | 'FOOTBALL' | 'SPORTS' | 'POLITICS' | 'TECHNOLOGY' | 'ECONOMICS' | 'CULTURE';
export type MarketOutcome = 'FOLLOW' | 'FADE' | 'PENDING' | 'UNRESOLVED' | 'CANCELLED';
export type MarketStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'PENDING_RESOLUTION' | 'RESOLVED' | 'VOIDED';

export interface AIAnalysis {
  provenance?: { provider: string; model: string; version: string | null; raw: string; generatedAt: string;
    versionSource?: 'provider-version' | 'provider-model-id'; systemFingerprint?: string | null; responseId?: string | null };
  confidenceRange?: [number, number];
  probability: number;
  confidence: number;
  prediction: 'YES' | 'NO';
  summary: string;
  bullCase: string;
  bearCase: string;
  keyFactors: string[];
  riskFactors?: string[];
  sources: string[];
  generatedAt: string;
  oracle?: {
    version?: number;
    settlementModel?: string;
    provider?: string;
    [key: string]: unknown;
  };
}

export interface Market {
  marketId: string;
  protocolVersion?: 1 | 2;
  contractAddress?: string;
  proof?: {
    marketAddress?: string;
    ammAddress?: string;
    yesTokenAddress?: string;
    noTokenAddress?: string;
    collateralAddress?: string;
    oracleAdapterAddress?: string;
    categoryId?: number;
    categoryVersion?: number;
    oraclePolicyId?: number;
    oraclePolicyVersion?: number;
    feeVersion?: number;
    metadataSchemaVersion?: number;
    termsHash?: string;
    resolutionSourceHash?: string;
    ancillaryDataHash?: string;
    metadataURI?: string;
    liveness?: number;
    voidAfter?: number;
    oracleState?: string;
    oracleRequestKey?: string | null;
    resolutionRequestedAt?: number | null;
    indexedThroughBlock?: string;
    externalSettlement?: {
      liveMarketId: string;
      source: string;
      externalMarketId: string;
      sourceUrl: string;
      resolutionSource?: string;
      status: string;
      sourceOutcome?: 'YES' | 'NO' | 'UNDETERMINED';
      sourceOutcomeObservedAt?: string;
      createTxHash?: string;
      errorMessage?: string;
    };  };
  category: MarketCategory;
  resolutionTime: number;
  followPool: bigint;
  fadePool: bigint;
  resolved: boolean;
  outcome: MarketOutcome;
  status: MarketStatus;
  resolvedAt?: number;
  openedAt?: number;
  closedAt?: number;
  resolutionReason?: string;
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
