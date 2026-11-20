/**
 * Plain-language helpers for market pages. Pure functions, no I/O.
 *
 * AMM note: in a constant-product YES/NO pool the *scarcer* token is the more
 * expensive one, so P(YES) = noReserve / (yesReserve + noReserve).
 */

export function v2YesProbability(yesReserve: bigint, noReserve: bigint): number | null {
  const total = yesReserve + noReserve;
  if (yesReserve <= 0n || noReserve <= 0n || total <= 0n) return null;
  // Scale before dividing so bigint precision survives the conversion.
  return Number((noReserve * 1_000_000n) / total) / 1_000_000;
}

/** Gross payout per 1 USDC staked if the position wins (before fees). */
export function payoutMultiple(probability: number): number | null {
  if (!Number.isFinite(probability) || probability <= 0 || probability >= 1) return null;
  return 1 / probability;
}

export type AiMarketGap = {
  /** AI minus market, in percentage points (positive = AI more bullish on YES). */
  points: number;
  kind: 'aligned' | 'ai-higher' | 'ai-lower';
  headline: string;
  detail: string;
};

const ALIGNED_POINTS = 5;

export function aiMarketGap(aiProbability: number, marketProbability: number): AiMarketGap | null {
  if (![aiProbability, marketProbability].every((v) => Number.isFinite(v) && v >= 0 && v <= 1)) return null;
  const points = Math.round((aiProbability - marketProbability) * 1000) / 10;
  const ai = Math.round(aiProbability * 100);
  const market = Math.round(marketProbability * 100);
  if (Math.abs(points) < ALIGNED_POINTS) {
    return {
      points,
      kind: 'aligned',
      headline: 'AI and the market agree',
      detail: `AI says ${ai}% YES and the market price implies ${market}%. No clear disagreement to trade on.`,
    };
  }
  const higher = points > 0;
  return {
    points,
    kind: higher ? 'ai-higher' : 'ai-lower',
    headline: higher ? 'AI is more confident in YES than the market' : 'AI is less confident in YES than the market',
    detail: `AI says ${ai}% YES, the market says ${market}% (${Math.abs(points).toFixed(1)} points apart). `
      + 'A gap is a reason to look closer, not proof the market is wrong — AI forecasts have not reliably beaten market prices.',
  };
}

export type PositionPreview = {
  /** Total USDC received if the chosen side wins. */
  ifRight: number;
  profitIfRight: number;
  /** USDC lost if the chosen side loses. */
  ifWrong: number;
};

/** Winning tokens redeem 1:1 for USDC, so exposure == payout if right. */
export function positionPreview(stakeUsdc: number, finalExposureUsdc: number): PositionPreview | null {
  if (![stakeUsdc, finalExposureUsdc].every((v) => Number.isFinite(v) && v >= 0) || stakeUsdc <= 0) return null;
  return {
    ifRight: finalExposureUsdc,
    profitIfRight: finalExposureUsdc - stakeUsdc,
    ifWrong: stakeUsdc,
  };
}

/**
 * FOLLOW always means "back the AI's pick" and FADE "bet against it".
 * Whether that buys the YES or the NO token depends on what the AI picked.
 */
export function sideBuysYes(side: 'FOLLOW' | 'FADE', aiSuggestedSide: string | undefined | null): boolean {
  return (side === 'FOLLOW') === aiPicksYes(aiSuggestedSide);
}

/** The one definition of "the AI picked YES". Anything that is not NO/FADE counts as YES. */
export function aiPicksYes(pick: string | undefined | null): boolean {
  const p = String(pick ?? 'YES').toUpperCase();
  return p !== 'NO' && p !== 'FADE';
}

/**
 * Turn a FOLLOW/FADE result (1 = follow won, 2 = fade won, 0 = none) into the real
 * question result (1 = YES, 2 = NO, 0 = none). Winners claim the token for that result.
 */
export function questionOutcome(productOutcome: 0 | 1 | 2, aiIsYes: boolean): 0 | 1 | 2 {
  if (productOutcome === 0) return 0;
  return (productOutcome === 1) === aiIsYes ? 1 : 2;
}

export const QUICK_BET_OPTIONS = [5, 10, 25, 50] as const;
export const DEFAULT_QUICK_BET = 10;

/** Accepts only the preset limits so a tampered stored value can't raise the cap. */
export function normalizeQuickBet(value: unknown): number {
  const n = typeof value === 'string' ? Number(value) : value;
  return (QUICK_BET_OPTIONS as readonly number[]).includes(n as number) ? (n as number) : DEFAULT_QUICK_BET;
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 3600) return plural(Math.max(1, Math.round(seconds / 60)), 'minute');
  if (seconds < 86_400) return plural(Math.round(seconds / 3600), 'hour');
  return plural(Math.round(seconds / 86_400), 'day');
}

/** Hash-style source labels are commitments, not readable names. */
function readableSource(value: string | null | undefined, fallback: string): string {
  const text = value?.trim();
  if (!text) return fallback;
  if (/0x[0-9a-fA-F]{6,}/.test(text)) return `${fallback} (exact source is committed on-chain)`;
  return text;
}

export type ResolutionSummary = {
  who: string;
  source: string;
  disputeWindow: string;
  ifUnclear: string;
  trustNote: string;
};

export function summarizeResolution(input: {
  isV2: boolean;
  category: string;
  resolutionSource?: string | null;
  livenessSeconds?: number | null;
  voidAfterSeconds?: number | null;
  externalSource?: string | null;
  /** False when V2 results cannot be settled on this network yet (no working oracle). */
  settlementLive?: boolean;
}): ResolutionSummary {
  const defaultSource = input.category.toLowerCase() === 'football' ? 'API-Football' : 'CoinGecko / Binance prices';
  const source = readableSource(
    input.resolutionSource,
    input.externalSource ? `${input.externalSource} market result` : defaultSource,
  );
  if (!input.isV2) {
    return {
      who: 'The ArcSignal operator submits the result after the market closes.',
      source,
      disputeWindow: 'None — the result is final as soon as the operator posts it.',
      ifUnclear: 'The operator can cancel the market. Whether stakes are refundable depends on the deployed contract.',
      trustNote: 'You are trusting the operator to report the result honestly.',
    };
  }
  if (input.settlementLive === false) {
    return {
      who: 'Automatic settlement for this market type is not live on this network yet.',
      source,
      disputeWindow: 'Not active yet.',
      ifUnclear: input.voidAfterSeconds && input.voidAfterSeconds > 0
        ? `If no result is settled within ${formatDuration(input.voidAfterSeconds)} of closing, the market is voided and you can redeem your collateral (half the value of your YES + NO tokens).`
        : 'If no result is settled in time, the market is voided and collateral can be redeemed.',
      trustNote: 'Until settlement is live, this market cannot pay out a winning side. Trade with that in mind.',
    };
  }
  if (input.settlementLive === true) {
    return {
      who: 'The ArcSignal operator proposes the result from the stated source, checked right at close.',
      source,
      disputeWindow: input.livenessSeconds
        ? `${formatDuration(input.livenessSeconds)} after the result is proposed. Anyone can dispute it in that time by posting a bond.`
        : 'Set per market; not indexed yet.',
      ifUnclear: input.voidAfterSeconds && input.voidAfterSeconds > 0
        ? `If no result is settled within ${formatDuration(input.voidAfterSeconds)} of closing, the market is voided and you can redeem your collateral.`
        : 'If no result is settled in time, the market can be voided and collateral returned.',
      trustNote: 'Disputed results are decided by a multisig arbiter, not by the operator alone. If the arbiter sides with the disputer, their bond is returned.',
    };
  }
  return {
    who: 'The ArcSignal operator proposes the result after the market closes.',
    source,
    disputeWindow: input.livenessSeconds ? `${formatDuration(input.livenessSeconds)} after a result is proposed, before it is final.` : 'Set per market; not indexed yet.',
    ifUnclear: input.voidAfterSeconds && input.voidAfterSeconds > 0
      ? `If no result is settled within ${formatDuration(input.voidAfterSeconds)} of closing, the market is voided and you can redeem your original collateral.`
      : 'If no result is settled in time, the market can be voided and collateral returned.',
    trustNote: 'Today the operator is a single trusted account, and this app has no way for users to challenge a result. Treat resolution as operator-run until a decentralized oracle is in place.',
  };
}

export type TrackRecordEntry = { resolved: number; accuracy: number | null; brierScore: number | null };

export type TrackRecord = {
  resolved: number;
  accuracy: number | null;
  brierScore: number | null;
  maturity: 'none' | 'tiny' | 'early' | 'established';
  caveat: string;
};

/** Pool per-agent results, weighting by resolved count. A coin-flip forecaster scores Brier 0.25. */
export function summarizeTrackRecord(entries: TrackRecordEntry[]): TrackRecord {
  const scored = entries.filter((e) => e.resolved > 0);
  const resolved = scored.reduce((sum, e) => sum + e.resolved, 0);
  if (resolved === 0) {
    return { resolved: 0, accuracy: null, brierScore: null, maturity: 'none', caveat: 'No AI call has been scored yet, so there is no track record to judge.' };
  }
  const weighted = (pick: (e: TrackRecordEntry) => number | null) => {
    const rows = scored.filter((e) => pick(e) !== null);
    const weight = rows.reduce((sum, e) => sum + e.resolved, 0);
    return weight === 0 ? null : rows.reduce((sum, e) => sum + (pick(e) as number) * e.resolved, 0) / weight;
  };
  const maturity = resolved < 10 ? 'tiny' : resolved < 50 ? 'early' : 'established';
  const caveat = maturity === 'tiny'
    ? `Only ${resolved} scored ${resolved === 1 ? 'call' : 'calls'} so far. That is far too few to say whether the AI is any good.`
    : maturity === 'early'
      ? `${resolved} scored calls. An early signal, not proof of skill.`
      : `${resolved} scored calls across all agents.`;
  return { resolved, accuracy: weighted((e) => e.accuracy), brierScore: weighted((e) => e.brierScore), maturity, caveat };
}
