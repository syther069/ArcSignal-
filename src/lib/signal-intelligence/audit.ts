import { createHash } from 'node:crypto';
import type { SignalAnalysis } from './types';
import { validProbability } from './scoring';

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
}
export function hashAnalysis(signal: Omit<SignalAnalysis, 'analysisHash'>): string {
  // Hash the complete immutable record, including raw provider response and actual input snapshot.
  return createHash('sha256').update(canonical(signal), 'utf8').digest('hex');
}
export function verifyAnalysis(signal: SignalAnalysis): boolean {
  const { analysisHash, ...original } = signal;
  return analysisHash === hashAnalysis(original);
}
export function validateAnalysis(signal: SignalAnalysis): void {
  const [low, high] = signal.confidenceRange;
  if (!validProbability(signal.probability) || !validProbability(signal.confidence)
    || !validProbability(low) || !validProbability(high) || low > signal.probability || high < signal.probability
    || !Number.isFinite(Date.parse(signal.snapshotAt)) || !Number.isFinite(Date.parse(signal.generatedAt))
    || Date.parse(signal.snapshotAt) > Date.parse(signal.generatedAt)
    || !signal.originalAnalysis.trim() || !verifyAnalysis(signal)) throw new Error('Invalid signal analysis or audit hash');
}
