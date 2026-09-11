import { describe, expect, it } from 'vitest';
import { boundedInteger, validMarketId } from '@/lib/v2-api';

describe('V2 API validation', () => {
  it('accepts only canonical bytes32 market IDs', () => {
    expect(validMarketId(`0x${'ab'.repeat(32)}`)).toBe(true);
    expect(validMarketId('market-1')).toBe(false);
    expect(validMarketId(`0x${'ab'.repeat(31)}`)).toBe(false);
  });

  it('bounds non-negative pagination values', () => {
    expect(boundedInteger('25', 50, 100)).toBe(25);
    expect(boundedInteger('999', 50, 100)).toBe(100);
    expect(boundedInteger('-1', 50, 100)).toBe(50);
    expect(boundedInteger('abc', 50, 100)).toBe(50);
  });
});
