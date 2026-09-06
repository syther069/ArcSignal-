import { describe, expect, it } from 'vitest';
import { isMarketIndexUsable } from '@/lib/indexed-markets';

describe('market index health', () => {
  const now = 1_800_000_000_000;

  it('accepts only a recent cursor near the current Arc head', () => {
    expect(isMarketIndexUsable({ lastBlock: 1_000n, updatedAtMs: now - 1_000 }, 1_010n, now)).toBe(true);
    expect(isMarketIndexUsable({ lastBlock: 900n, updatedAtMs: now - 1_000 }, 1_010n, now)).toBe(true);
    expect(isMarketIndexUsable({ lastBlock: 1_000n, updatedAtMs: now - 1_000 }, 3_100n, now)).toBe(false);
  });

  it('rejects stale, missing, or future cursor state', () => {
    expect(isMarketIndexUsable(null, 1_010n, now)).toBe(false);
    expect(isMarketIndexUsable({ lastBlock: 1_000n, updatedAtMs: now - 600_001 }, 1_010n, now)).toBe(false);
    expect(isMarketIndexUsable({ lastBlock: 1_011n, updatedAtMs: now - 1_000 }, 1_010n, now)).toBe(false);
  });
});
