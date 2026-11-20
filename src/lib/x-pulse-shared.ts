/** X Pulse types and pure helpers, safe for client and server. */

export type PulseMood = 'YES' | 'NO' | 'SPLIT' | 'QUIET';
export type PulseVolume = 'quiet' | 'active' | 'surging';

export type XPulse = {
  id: string;
  marketId: string;
  mood: PulseMood;
  /** Share of relevant posts expecting YES (0–1), or null when X is quiet. */
  lean: number | null;
  volume: PulseVolume;
  summary: string;
  citations: { url: string; title: string | null; kind: 'x' | 'web' }[];
  model: string;
  createdAt: string;
};

const MOODS: PulseMood[] = ['YES', 'NO', 'SPLIT', 'QUIET'];
const VOLUMES: PulseVolume[] = ['quiet', 'active', 'surging'];

/** Validates Grok's JSON. Anything off-contract is rejected rather than guessed. */
export function parsePulseReply(value: unknown): Pick<XPulse, 'mood' | 'lean' | 'volume' | 'summary'> {
  const v = (value ?? {}) as Record<string, unknown>;
  const mood = String(v.mood ?? '').toUpperCase() as PulseMood;
  const volume = String(v.volume ?? '').toLowerCase() as PulseVolume;
  if (!MOODS.includes(mood) || !VOLUMES.includes(volume)) throw new Error('X Pulse reply has an invalid mood or volume');
  const summary = typeof v.summary === 'string' ? v.summary.trim().slice(0, 240) : '';
  if (!summary) throw new Error('X Pulse reply has no summary');
  let lean: number | null = null;
  if (mood !== 'QUIET') {
    const n = typeof v.lean === 'string' ? Number(v.lean) : v.lean;
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 1) throw new Error('X Pulse reply has an invalid lean');
    lean = n;
  }
  return { mood, lean, volume, summary };
}

/**
 * One line comparing the crowd on X with the market price and the AI median.
 * All probabilities are P(YES) in 0–1; any may be missing.
 */
export function summarizePulse(pulse: Pick<XPulse, 'mood' | 'lean' | 'volume'>, marketYes: number | null, aiYes: number | null): string {
  if (pulse.mood === 'QUIET' || pulse.lean === null) return 'X is quiet on this question, so there is no crowd read to compare yet.';
  const pct = (p: number) => `${Math.round(p * 100)}%`;
  const parts = [`X leans ${pct(pulse.lean)} YES`];
  if (marketYes !== null) parts.push(`the market prices ${pct(marketYes)}`);
  if (aiYes !== null) parts.push(`the AI says ${pct(aiYes)}`);
  const line = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}.` : `${parts[0]}.`;
  if (marketYes === null) return line;
  const gap = Math.round((pulse.lean - marketYes) * 100);
  if (Math.abs(gap) < 10) return `${line} The crowd and the price roughly agree.`;
  return `${line} X is ${gap > 0 ? 'more' : 'less'} bullish on YES than the price by ${Math.abs(gap)} points. Loud does not mean right.`;
}

export function pulseAgeLabel(createdAt: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(createdAt)) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'} ago`;
}
