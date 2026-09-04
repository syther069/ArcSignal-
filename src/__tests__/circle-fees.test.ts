import { describe, expect, it } from 'vitest';
import { formatCircleGasFee } from '@/lib/circle-fees';

describe('formatCircleGasFee', () => {
  it('accepts Circle decimal-denominated fee strings', () => {
    expect(formatCircleGasFee('0.000000945')).toBe('9.45e-7');
  });

  it('accepts base-unit integer fee strings', () => {
    expect(formatCircleGasFee('945000000000')).toBe('9.45e-7');
  });

  it('does not throw for malformed fee data', () => {
    expect(formatCircleGasFee('not-a-fee')).toBeNull();
  });
});
