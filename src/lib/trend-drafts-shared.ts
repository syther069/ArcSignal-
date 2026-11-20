/**
 * Markets drafted by Grok from X trends. Pure rules, safe on client and server.
 *
 * Drafts are limited to what ArcSignal's oracle can settle today: a CoinGecko USD price,
 * "at or above" a threshold, at a fixed time. Anything else is rejected, never guessed.
 */

export const CORE_SYMBOLS = ['BTC', 'ETH', 'SOL', 'XRP', 'SUI', 'AVAX'] as const;
/** Extra coins, only when TREND_EXTRA_SYMBOLS=true (the oracle must allow them too). */
export const EXTRA_SYMBOLS = ['DOGE', 'BNB', 'LINK', 'TON'] as const;
export const DRAFT_SYMBOLS = [...CORE_SYMBOLS, ...EXTRA_SYMBOLS] as const;
export type DraftSymbol = (typeof DRAFT_SYMBOLS)[number];

export function extraSymbolsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.TREND_EXTRA_SYMBOLS === 'true';
}

export function draftSymbols(extra = extraSymbolsEnabled()): readonly DraftSymbol[] {
  return extra ? DRAFT_SYMBOLS : CORE_SYMBOLS;
}

export const DRAFT_EXPIRY_HOURS = 12;
export type Buzz = 'quiet' | 'active' | 'surging';
const BUZZ_RANK: Record<Buzz, number> = { quiet: 0, active: 1, surging: 2 };

/**
 * Higher = more worth a market: louder buzz first, then a split crowd (lean near 50%),
 * because a one-sided crowd makes a dull market.
 */
export function draftScore(buzz: Buzz, lean: number): number {
  const split = 1 - Math.abs(lean - 0.5) * 2; // 1 at 50%, 0 at 0% or 100%
  return Math.round((BUZZ_RANK[buzz] * 10 + split * 9) * 100) / 100;
}

export function isExpired(createdAt: string, now = Date.now()): boolean {
  return now - Date.parse(createdAt) > DRAFT_EXPIRY_HOURS * 3_600_000;
}
export const MAX_THRESHOLD_DISTANCE = 0.25; // within ±25% of the live price
export const MIN_HORIZON_HOURS = 1;
export const MAX_HORIZON_HOURS = 72;

export type DraftStatus = 'draft' | 'approved' | 'rejected' | 'published' | 'failed';

export type MarketDraft = {
  id: string;
  status: DraftStatus;
  symbol: DraftSymbol;
  threshold: number;
  horizonHours: number;
  reason: string;
  citations: { url: string; title: string | null; kind: 'x' | 'web' }[];
  referencePrice: number;
  /** How loud X is about this level (null on drafts made before sentiment ranking). */
  buzz: Buzz | null;
  /** Share of relevant posts expecting YES at this level, 0–1. */
  lean: number | null;
  postCount: number | null;
  score: number | null;
  model: string;
  publishedMarketId: string | null;
  lastError: string | null;
  createdAt: string;
};

/** Two significant figures past the leading digit, like the existing generator. */
export function roundThreshold(value: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)) - 1);
  return Math.round(value / magnitude) * magnitude;
}

export function draftQuestion(symbol: string, threshold: number, closesAt: Date): string {
  return `Will ${symbol} be at or above $${threshold.toLocaleString('en-US')} on ${closesAt.toUTCString()}?`;
}

export function draftCriteria(symbol: string, threshold: number, closesAt: Date): string {
  return `Resolves YES if ${symbol}/USD on CoinGecko is at or above $${threshold.toLocaleString('en-US')} at ${closesAt.toUTCString()}; otherwise resolves NO.`;
}

/**
 * Validates one idea from Grok against live prices. Returns a clean draft input or a reason it
 * was rejected. Nothing outside the oracle's supported shape gets through.
 */
export type ValidIdea = { symbol: DraftSymbol; threshold: number; horizonHours: number; reason: string; referencePrice: number };

export function validateDraftIdea(idea: unknown, livePrices: Record<string, number>, symbols: readonly string[] = draftSymbols()):
  { ok: true; value: ValidIdea } | { ok: false; reason: string } {
  const v = (idea ?? {}) as Record<string, unknown>;
  const symbol = String(v.symbol ?? '').toUpperCase();
  if (!symbols.includes(symbol)) return { ok: false, reason: `Unsupported asset ${symbol || '(none)'}` };
  const price = livePrices[symbol];
  if (!price || price <= 0) return { ok: false, reason: `No live price for ${symbol}` };
  const raw = typeof v.threshold === 'string' ? Number(v.threshold) : v.threshold;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return { ok: false, reason: 'Invalid threshold' };
  const threshold = roundThreshold(raw);
  if (Math.abs(threshold - price) / price > MAX_THRESHOLD_DISTANCE) return { ok: false, reason: `Threshold is more than 25% from the live ${symbol} price` };
  const hours = typeof v.horizonHours === 'string' ? Number(v.horizonHours) : v.horizonHours;
  if (typeof hours !== 'number' || !Number.isInteger(hours) || hours < MIN_HORIZON_HOURS || hours > MAX_HORIZON_HOURS) {
    return { ok: false, reason: 'Horizon must be 1 to 72 whole hours' };
  }
  const reason = typeof v.reason === 'string' ? v.reason.trim().slice(0, 240) : '';
  if (!reason) return { ok: false, reason: 'Missing reason' };
  return { ok: true, value: { symbol: symbol as DraftSymbol, threshold, horizonHours: hours, reason, referencePrice: price } };
}

/** Sentiment for one idea. Strict: an idea with bad sentiment fields is rejected, not guessed. */
export function validateSentiment(idea: unknown):
  { ok: true; value: { buzz: Buzz; lean: number; postCount: number; score: number } } | { ok: false; reason: string } {
  const v = (idea ?? {}) as Record<string, unknown>;
  const buzz = String(v.buzz ?? '').toLowerCase() as Buzz;
  if (!(buzz in BUZZ_RANK)) return { ok: false, reason: 'Invalid buzz' };
  const lean = typeof v.lean === 'string' ? Number(v.lean) : v.lean;
  if (typeof lean !== 'number' || !Number.isFinite(lean) || lean < 0 || lean > 1) return { ok: false, reason: 'Invalid lean' };
  const count = typeof v.postCount === 'string' ? Number(v.postCount) : v.postCount;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0 || count > 1_000_000) return { ok: false, reason: 'Invalid post count' };
  if (buzz !== 'quiet' && count < 5) return { ok: false, reason: 'Too few posts to call it a trend' };
  return { ok: true, value: { buzz, lean, postCount: count, score: draftScore(buzz, lean) } };
}

/** Same coin, price level within 2%, and close time within 6 hours. */
export function sameMarket(a: { symbol: string; threshold: number; closesAt: number }, b: { symbol: string; threshold: number; closesAt: number }): boolean {
  return a.symbol === b.symbol
    && Math.abs(a.threshold - b.threshold) / Math.max(a.threshold, b.threshold) <= 0.02
    && Math.abs(a.closesAt - b.closesAt) <= 6 * 3600;
}

export type TrendInfo = { reason: string; buzz: Buzz | null; lean: number | null; posts: string[] };

/** Reads the "Trending on X" details stored on a published x-trend market's analysis. */
export function trendInfo(analysis: unknown): TrendInfo | null {
  const a = (analysis ?? {}) as Record<string, unknown>;
  if (a.subType !== 'x-trend' || typeof a.trendReason !== 'string' || !a.trendReason.trim()) return null;
  const buzz = typeof a.trendBuzz === 'string' && ['quiet', 'active', 'surging'].includes(a.trendBuzz) ? a.trendBuzz as Buzz : null;
  const lean = typeof a.trendLean === 'number' && a.trendLean >= 0 && a.trendLean <= 1 ? a.trendLean : null;
  const posts = Array.isArray(a.trendPosts) ? a.trendPosts.filter((p): p is string => typeof p === 'string' && /^https:\/\/(x|twitter)\.com\//.test(p)).slice(0, 3) : [];
  return { reason: a.trendReason.trim().slice(0, 240), buzz, lean, posts };
}
