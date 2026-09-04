import { describe, expect, it } from 'vitest';
import {
  chunkEnd,
  finalizedBlock,
  projectionForEvent,
  readPositiveInteger,
} from '@/lib/indexer-helpers';

describe('indexer helpers', () => {
  it('follows one block behind the latest head at Arc’s default confirmation depth', () => {
    expect(finalizedBlock(100n, 1n)).toBe(99n);
    expect(finalizedBlock(1n, 1n)).toBe(0n);
    expect(finalizedBlock(0n, 1n)).toBe(0n);
    expect(readPositiveInteger(undefined, 1, 'INDEX_CONFIRMATIONS')).toBe(1);
  });

  it('still honors a conservative confirmation override', () => {
    expect(finalizedBlock(100n, 12n)).toBe(88n);
    expect(finalizedBlock(12n, 12n)).toBe(0n);
    expect(chunkEnd(50n, 88n, 20n)).toBe(69n);
    expect(chunkEnd(70n, 88n, 20n)).toBe(88n);
  });

  it('validates bounded-work environment values', () => {
    expect(readPositiveInteger(undefined, 8, 'CHUNKS')).toBe(8);
    expect(readPositiveInteger('12', 8, 'CHUNKS')).toBe(12);
    expect(() => readPositiveInteger('0', 8, 'CHUNKS')).toThrow('positive integer');
    expect(() => readPositiveInteger('1.5', 8, 'CHUNKS')).toThrow('positive integer');
  });

  it('normalizes stake projections and rejects malformed events', () => {
    expect(projectionForEvent('Staked', {
      marketId: 'market-1',
      user: '0xABC',
      side: 1,
      amount: 42n,
    })).toEqual({
      kind: 'stake',
      marketId: 'market-1',
      user: '0xabc',
      side: 1,
      amount: 42n,
    });
    expect(() => projectionForEvent('Staked', {
      marketId: 'market-1',
      user: '0xABC',
      side: 2,
      amount: 42n,
    })).toThrow('invalid side');
  });

  it('requires claimed amounts so a marker cannot outrun its projection', () => {
    expect(() => projectionForEvent('Claimed', {
      marketId: 'market-1',
      user: '0xABC',
    })).toThrow('missing amount');
  });
});