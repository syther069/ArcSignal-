import { describe, expect, it } from 'vitest';
import {
  integerSquareRoot,
  liquidityShares,
  protocolFeeForInput,
  quoteV2ExactInput,
  voidPayout,
} from '@/lib/v2-market-math';

describe('V2 market reference math', () => {
  it('matches the constant-product exact-input formula with both fee components', () => {
    expect(quoteV2ExactInput({
      amountIn: 10_000_000n,
      reserveIn: 200_000_000n,
      reserveOut: 200_000_000n,
      protocolFeeBps: 50n,
      lpFeeBps: 100n,
    })).toBe(9_387_657n);
    expect(protocolFeeForInput(10_000_000n, 50n)).toBe(50_000n);
  });

  it('mints proportional shares using the limiting side', () => {
    expect(liquidityShares({
      yesAmount: 20n,
      noAmount: 30n,
      yesReserve: 100n,
      noReserve: 100n,
      totalSupply: 1_000n,
    })).toBe(200n);
  });

  it('computes initial geometric-mean liquidity and integer rounding', () => {
    expect(integerSquareRoot(200n)).toBe(14n);
    expect(liquidityShares({
      yesAmount: 100n,
      noAmount: 400n,
      yesReserve: 0n,
      noReserve: 0n,
      totalSupply: 0n,
    })).toBe(200n);
  });

  it('pays each voided outcome token at half of one collateral unit', () => {
    expect(voidPayout(40_000_000n, 10_000_000n)).toBe(25_000_000n);
    expect(voidPayout(1n, 0n)).toBe(0n);
  });

  it('rejects invalid fees and negative amounts', () => {
    expect(() => quoteV2ExactInput({
      amountIn: 1n,
      reserveIn: 1n,
      reserveOut: 1n,
      protocolFeeBps: 9_999n,
      lpFeeBps: 1n,
    })).toThrow('Invalid fee configuration');
    expect(() => voidPayout(-1n, 0n)).toThrow('Amounts cannot be negative');
  });
});
