import { describe, expect, it } from 'vitest';
import {
  serializeV2EventArgs,
  v2ChunkEnd,
  v2MarketStateLabel,
  v2OracleStateLabel,
  v2OutcomeLabel,
} from '@/lib/v2-indexer-helpers';

describe('V2 indexer helpers', () => {
  it('maps all explicit lifecycle states', () => {
    expect([0, 1, 2, 3].map(v2MarketStateLabel)).toEqual(['OPEN', 'CLOSED', 'RESOLVED', 'VOIDED']);
    expect([0, 1, 2, 3, 4].map(v2OracleStateLabel)).toEqual([
      'NONE', 'REQUESTED', 'PROPOSED', 'DISPUTED', 'SETTLED',
    ]);
    expect([0, 1, 2, 3].map(v2OutcomeLabel)).toEqual([null, 'YES', 'NO', 'UNDETERMINED']);
  });

  it('rejects unknown enum values rather than mislabeling indexed state', () => {
    expect(() => v2MarketStateLabel(4)).toThrow('Unknown V2 market state');
    expect(() => v2OracleStateLabel(-1)).toThrow('Unknown V2 oracle state');
    expect(() => v2OutcomeLabel(9)).toThrow('Unknown V2 outcome');
  });

  it('serializes event bigint fields without losing precision', () => {
    expect(serializeV2EventArgs({ amount: 2n ** 200n })).toContain((2n ** 200n).toString());
  });

  it('bounds chunks at the finalized head', () => {
    expect(v2ChunkEnd(100n, 150n, 25n)).toBe(124n);
    expect(v2ChunkEnd(140n, 150n, 25n)).toBe(150n);
  });
});
