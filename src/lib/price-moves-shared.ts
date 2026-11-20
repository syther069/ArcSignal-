/** Price-move detection and wording. Pure: safe on client and server. */

export const MOVE_THRESHOLD = 0.10; // 10 percentage points
export const MOVE_WINDOW_MINUTES = 60;

export type PricePoint = { pYes: number; observedAt: string };

export type PriceMoveNote = {
  id: string;
  marketId: string;
  fromP: number;
  toP: number;
  windowMinutes: number;
  note: string;
  citations: { url: string; title: string | null; kind: 'x' | 'web' }[];
  model: string;
  noteHash: string;
  createdAt: string;
};

/**
 * Compares the newest point with the one closest to `windowMinutes` ago (accepting 50–70 min for a
 * 60 min window). Returns the move when it is at least `threshold`, else null.
 */
export function detectMove(points: PricePoint[], now: number, threshold = MOVE_THRESHOLD, windowMinutes = MOVE_WINDOW_MINUTES) {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
  const latest = sorted.at(-1)!;
  if (now - Date.parse(latest.observedAt) > 15 * 60_000) return null; // stale data, no claim
  const target = now - windowMinutes * 60_000;
  const slack = Math.round(windowMinutes / 6) * 60_000;
  const candidates = sorted.filter((p) => Math.abs(Date.parse(p.observedAt) - target) <= slack);
  if (!candidates.length) return null;
  const base = candidates.reduce((best, p) => Math.abs(Date.parse(p.observedAt) - target) < Math.abs(Date.parse(best.observedAt) - target) ? p : best);
  const delta = latest.pYes - base.pYes;
  if (Math.abs(delta) < threshold) return null;
  return { fromP: base.pYes, toP: latest.pYes, windowMinutes };
}

export function moveHeadline(fromP: number, toP: number, windowMinutes: number): string {
  const points = Math.round((toP - fromP) * 100);
  const span = windowMinutes >= 60 ? `${Math.round(windowMinutes / 60)}h` : `${windowMinutes} min`;
  return `YES price ${points > 0 ? 'rose' : 'fell'} ${Math.abs(points)} pts in ${span} (${Math.round(fromP * 100)}% → ${Math.round(toP * 100)}%)`;
}

export function parseMoveReply(value: unknown): string {
  const v = (value ?? {}) as Record<string, unknown>;
  const confidence = String(v.confidence ?? '').toLowerCase();
  const cause = typeof v.cause === 'string' ? v.cause.trim().slice(0, 240) : '';
  if (confidence === 'none' || !cause) return 'No clear public cause found. Moves can come from a few large trades.';
  if (confidence === 'possible') return `Possibly: ${cause}`;
  if (confidence === 'clear') return cause;
  throw new Error('Price-move reply has an invalid confidence');
}
