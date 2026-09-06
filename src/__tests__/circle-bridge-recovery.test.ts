import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CircleBridgeResult } from '@/lib/circle-app-kit';
import {
  clearCircleBridgeRecovery,
  loadCircleBridgeRecovery,
  saveCircleBridgeRecovery,
} from '@/lib/circle-bridge-recovery';

const values = new Map<string, string>();
const storage = {
  getItem: vi.fn((key: string) => values.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  removeItem: vi.fn((key: string) => values.delete(key)),
};

const result = {
  state: 'error',
  amount: '10',
  provider: 'CCTPV2BridgingProvider',
  steps: [{ name: 'mint', state: 'error', errorMessage: 'temporary failure' }],
} as unknown as CircleBridgeResult;

describe('Circle bridge recovery storage', () => {
  beforeEach(() => {
    values.clear();
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', storage);
  });

  it('restores a retryable result only for the wallet that created it', () => {
    saveCircleBridgeRecovery('0xABC', result);
    expect(loadCircleBridgeRecovery('0xabc')).toEqual(result);
    expect(loadCircleBridgeRecovery('0xdef')).toBeNull();
  });

  it('rejects expired recovery state', () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(1_000).mockReturnValueOnce(86_401_001);
    saveCircleBridgeRecovery('0xabc', result);
    expect(loadCircleBridgeRecovery('0xabc')).toBeNull();
    vi.restoreAllMocks();
  });

  it('clears saved state after completion', () => {
    saveCircleBridgeRecovery('0xabc', result);
    clearCircleBridgeRecovery();
    expect(loadCircleBridgeRecovery('0xabc')).toBeNull();
  });
});
