export type SignalStatus = 'pending' | 'resolved' | 'disputed' | 'invalid' | 'cancelled';
export type BinaryResult = 'YES' | 'NO';
export type TimeHorizon = 'Intraday' | '1 day' | '1 week' | '1 month' | 'Long-term';
export interface SignalSource { name: string; url: string | null; accessedAt: string }
export interface AIAgent {
  id: string; name: string; description: string; reasoningStyle: string;
  modelProvider: string; modelName: string; modelVersion: string | null;
  modelVersionSource?: import('./model-identity').ModelVersionSource;
  status: 'active' | 'paused' | 'deprecated'; createdAt: string;
}
export interface SignalAnalysis {
  id: string; marketId: string; agentId: string; agentName: string;
  modelProvider: string; modelName: string; modelVersion: string | null;
  modelVersionSource?: import('./model-identity').ModelVersionSource;
  systemFingerprint?: string | null; providerResponseId?: string | null;
  generatedAt: string; snapshotAt: string; question: string; category: string;
  timeHorizon: TimeHorizon; probability: number; confidenceRange: [number, number];
  confidence: number; supportingFactors: string[]; contradictingFactors: string[];
  sources: SignalSource[]; previousSignalId: string | null;
  originalAnalysis: string; snapshot: unknown; analysisHash: string;
}
export interface SignalResolution {
  status: SignalStatus; finalResult: BinaryResult | null; resolvedAt: string | null;
  resolutionSourceUrl: string | null; settlementTransactionHash: string | null;
}
export type AISignal = SignalAnalysis & SignalResolution;
export interface CalibrationBucket {
  lower: number; upper: number; count: number;
  predicted: number | null; observed: number | null;
}
export interface ScoringMetrics {
  total: number; resolved: number; pending: number; excluded: number;
  accuracy: number | null; brierScore: number | null; logLoss: number | null;
  calibrationScore: number | null; averageConfidence: number | null;
  calibration: CalibrationBucket[];
}
export interface AgentLeaderboardEntry extends ScoringMetrics {
  agent: AIAgent; rank: number | null; updatedAt: string | null;
  byCategory: Record<string, ScoringMetrics>;
  byTimeHorizon: Record<string, ScoringMetrics>;
  predictions: Pick<AISignal, 'id' | 'marketId' | 'question' | 'generatedAt' | 'probability' | 'status' | 'finalResult'>[];
}

export type SignalGenerationStatus = 'scheduled' | 'running' | 'retrying' | 'complete' | 'skipped' | 'predates';
export interface SignalCoverageRecord {
  marketId: string; question: string; category: string; marketStatus: string;
  resolutionTime: number; generationStatus: SignalGenerationStatus;
  signalCount: number; missingSignals: number; attemptCount: number;
  lastError: string | null; lastAttemptAt: string | null; nextAttemptAt: string | null;
  latestSnapshotAt: string | null; snapshotHealth: 'fresh' | 'stale' | 'missing';
  consensusable: boolean; pendingReconciliation: number;
  consensusProbability: number | null; medianProbability: number | null;
  minimumProbability: number | null; maximumProbability: number | null;
}
