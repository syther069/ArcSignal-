import { describe, expect, it } from 'vitest';
import {
  calculateArcGasReserveUsdc,
  calculateMaxArcStakeForAllowance,
  calculateMaxArcStakeUsdc,
} from '@/lib/arc-gas';

describe('ARC native USDC gas reservation', () => {
  it('keeps the minimum reserve at ordinary gas prices', () => {
    expect(calculateArcGasReserveUsdc(21_000_000_000n, true)).toBe(10_000n);
    expect(calculateArcGasReserveUsdc(21_000_000_000n, false)).toBe(10_000n);
  });

  it('raises the reserve when gas prices spike', () => {
    expect(calculateArcGasReserveUsdc(100_000_000_000n, true)).toBe(30_000n);
    expect(calculateArcGasReserveUsdc(100_000_000_000n, false)).toBe(20_000n);
  });

  it('never lets MAX consume the native USDC gas reserve', () => {
    expect(calculateMaxArcStakeUsdc(5_000_000n, 21_000_000_000n, true)).toEqual({
      reserve: 10_000n,
      maxStake: 4_990_000n,
    });
  });

  it('returns zero when the balance cannot cover the reserve', () => {
    expect(calculateMaxArcStakeUsdc(5_000n, 21_000_000_000n, false).maxStake).toBe(0n);
  });

  it('does not reserve approval gas when existing allowance covers the stake-only MAX', () => {
    expect(calculateMaxArcStakeForAllowance(
      5_000_000n,
      4_980_000n,
      100_000_000_000n,
    )).toEqual({
      reserve: 20_000n,
      maxStake: 4_980_000n,
    });
  });
});