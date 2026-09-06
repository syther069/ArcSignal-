export const ORACLE_POLICY_VERSION = 2;

const ALLOWED_SYMBOLS = new Set(['BTC', 'ETH', 'SOL', 'XRP', 'SUI', 'AVAX']);
const ALLOWED_TIMEFRAMES = new Set(['5m', '15m', '1h', '4h', '24h']);

export interface CryptoOracleSpec {
  version: 1 | typeof ORACLE_POLICY_VERSION;
  settlementModel?: 'ai-agreement-v1';
  provider: 'coingecko';
  symbol: string;
  targetPrice: number;
  comparator: 'gte';
  resolutionTimestamp: number;
  maxObservationDelaySeconds: number;
}

export interface CryptoPriceObservation {
  provider: 'coingecko' | 'binance';
  symbol: string;
  price: number;
  observedAt: number;
}

export type CryptoResolutionDecision =
  | { action: 'wait'; reason: string }
  | { action: 'manual-review'; reason: string }
  | { action: 'resolve'; questionResult: 'YES' | 'NO'; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface FootballOracleSpec {
  version: typeof ORACLE_POLICY_VERSION;
  settlementModel: 'ai-agreement-v1';
  provider: 'api-football';
  fixtureId: number;
  leagueId: number;
  season: number;
  criterion: 'home-win-full-time';
  resolutionTimestamp: number;
}

export function parseMarketPrediction(analysisJson: string): 'YES' | 'NO' {
  let analysis: unknown;
  try {
    analysis = JSON.parse(analysisJson);
  } catch {
    throw new Error('analysis is not valid JSON');
  }
  if (!isRecord(analysis) || (analysis.prediction !== 'YES' && analysis.prediction !== 'NO')) {
    throw new Error('analysis prediction is missing or invalid');
  }
  return analysis.prediction;
}

export function parseFootballOracleSpec(
  analysisJson: string,
  expectedResolutionTimestamp: number,
): FootballOracleSpec {
  let analysis: unknown;
  try {
    analysis = JSON.parse(analysisJson);
  } catch {
    throw new Error('analysis is not valid JSON');
  }
  if (!isRecord(analysis) || !isRecord(analysis.oracle)) {
    throw new Error('canonical football oracle policy is missing');
  }
  const oracle = analysis.oracle;
  if (
    oracle.version !== ORACLE_POLICY_VERSION
    || oracle.settlementModel !== 'ai-agreement-v1'
    || oracle.provider !== 'api-football'
    || !Number.isSafeInteger(oracle.fixtureId)
    || Number(oracle.fixtureId) <= 0
    || !Number.isSafeInteger(oracle.leagueId)
    || Number(oracle.leagueId) <= 0
    || !Number.isSafeInteger(oracle.season)
    || oracle.criterion !== 'home-win-full-time'
    || oracle.resolutionTimestamp !== expectedResolutionTimestamp
  ) {
    throw new Error('canonical football oracle policy is invalid');
  }
  return oracle as unknown as FootballOracleSpec;
}

export function resolvedOutcomeForPrediction(
  prediction: 'YES' | 'NO',
  questionResult: 'YES' | 'NO',
): 1 | 2 {
  return prediction === questionResult ? 1 : 2;
}

export function parseMarketTimeframe(marketId: string): string | null {
  const match = marketId.match(/-PRICE-(5m|15m|1h|4h|24h)-\d+$/);
  return match && ALLOWED_TIMEFRAMES.has(match[1]) ? match[1] : null;
}

export function assertFreshGenerationObservation(
  observation: CryptoPriceObservation,
  nowTimestamp: number,
  maxAgeSeconds = 120,
): void {
  if (
    observation.provider !== 'coingecko' ||
    !ALLOWED_SYMBOLS.has(observation.symbol.toUpperCase()) ||
    !Number.isFinite(observation.price) ||
    observation.price <= 0 ||
    !Number.isSafeInteger(observation.observedAt)
  ) {
    throw new Error('generation oracle observation is invalid');
  }

  if (observation.observedAt > nowTimestamp + 30) {
    throw new Error('generation oracle observation is future-dated');
  }

  if (nowTimestamp - observation.observedAt > maxAgeSeconds) {
    throw new Error('generation oracle observation is stale');
  }
}

export function parseCryptoOracleSpec(
  analysisJson: string,
  expectedResolutionTimestamp: number,
): CryptoOracleSpec {
  let analysis: unknown;
  try {
    analysis = JSON.parse(analysisJson);
  } catch {
    throw new Error('analysis is not valid JSON');
  }

  if (!isRecord(analysis) || !isRecord(analysis.oracle)) {
    throw new Error('canonical oracle policy is missing');
  }

  const oracle = analysis.oracle;
  if (
    (oracle.version !== 1 && oracle.version !== ORACLE_POLICY_VERSION) ||
    (oracle.version === ORACLE_POLICY_VERSION && oracle.settlementModel !== 'ai-agreement-v1') ||
    oracle.provider !== 'coingecko' ||
    typeof oracle.symbol !== 'string' ||
    !ALLOWED_SYMBOLS.has(oracle.symbol) ||
    typeof oracle.targetPrice !== 'number' ||
    !Number.isFinite(oracle.targetPrice) ||
    oracle.targetPrice <= 0 ||
    oracle.comparator !== 'gte' ||
    typeof oracle.resolutionTimestamp !== 'number' ||
    !Number.isSafeInteger(oracle.resolutionTimestamp) ||
    oracle.resolutionTimestamp !== expectedResolutionTimestamp ||
    typeof oracle.maxObservationDelaySeconds !== 'number' ||
    !Number.isSafeInteger(oracle.maxObservationDelaySeconds) ||
    oracle.maxObservationDelaySeconds < 30 ||
    oracle.maxObservationDelaySeconds > 300
  ) {
    throw new Error('canonical oracle policy is invalid');
  }

  return oracle as unknown as CryptoOracleSpec;
}

export function decideCryptoResolution(
  spec: CryptoOracleSpec,
  observation: CryptoPriceObservation,
  nowTimestamp: number,
): CryptoResolutionDecision {
  if (nowTimestamp < spec.resolutionTimestamp) {
    return { action: 'wait', reason: 'market has not reached its resolution timestamp' };
  }

  if (
    observation.provider !== spec.provider ||
    observation.symbol.toUpperCase() !== spec.symbol
  ) {
    return { action: 'manual-review', reason: 'oracle provider or symbol does not match policy' };
  }

  if (
    !Number.isFinite(observation.price) ||
    observation.price <= 0 ||
    !Number.isSafeInteger(observation.observedAt)
  ) {
    return { action: 'manual-review', reason: 'oracle observation is malformed' };
  }

  if (observation.observedAt > nowTimestamp + 30) {
    return { action: 'manual-review', reason: 'oracle observation timestamp is in the future' };
  }

  if (observation.observedAt < spec.resolutionTimestamp) {
    return {
      action: 'manual-review',
      reason: 'oracle observation predates the resolution timestamp',
    };
  }

  const distanceFromResolution = observation.observedAt - spec.resolutionTimestamp;
  if (distanceFromResolution > spec.maxObservationDelaySeconds) {
    return {
      action: 'manual-review',
      reason: `oracle observation is ${distanceFromResolution}s from resolution time`,
    };
  }

  const questionResult = observation.price >= spec.targetPrice ? 'YES' : 'NO';
  return {
    action: 'resolve',
    questionResult,
    reason: `${spec.symbol} observed at $${observation.price} for $${spec.targetPrice} threshold`,
  };
}
