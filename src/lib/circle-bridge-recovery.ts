import type { CircleBridgeResult } from './circle-app-kit';

const STORAGE_KEY = 'arcsignal:circle-bridge:v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1_000;

type StoredBridge = {
  version: 1;
  walletAddress: string;
  savedAt: number;
  result: CircleBridgeResult;
};

export function saveCircleBridgeRecovery(walletAddress: string, result: CircleBridgeResult) {
  try {
    const stored: StoredBridge = {
      version: 1,
      walletAddress: walletAddress.toLowerCase(),
      savedAt: Date.now(),
      result,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage may be unavailable. The in-memory retry flow remains usable.
  }
}

export function loadCircleBridgeRecovery(walletAddress: string): CircleBridgeResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Partial<StoredBridge>;
    if (
      stored.version !== 1
      || stored.walletAddress !== walletAddress.toLowerCase()
      || typeof stored.savedAt !== 'number'
      || Date.now() - stored.savedAt > MAX_AGE_MS
      || !stored.result
      || (stored.result.state !== 'error' && stored.result.state !== 'pending')
      || !Array.isArray(stored.result.steps)
      || typeof stored.result.amount !== 'string'
    ) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return stored.result;
  } catch {
    return null;
  }
}

export function clearCircleBridgeRecovery() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable.
  }
}
