import { describe, expect, it } from 'vitest';
import {
  ARC_NETWORK_FEE_HELPER,
  calculateArcGasReserveUsdc,
  calculateMaxArcStakeForAllowance,
  calculateMaxArcStakeUsdc,
  formatArcNetworkFee,
  formatArcNetworkFeeUsdc,
} from '@/lib/arc-gas';

describe('Arc native USDC network fee display', () => {
  const twentyGwei = 20_000_000_000n;

  it('formats sub-cent native fees as < $0.01, never ETH/Gwei/ARC', () => {
    const display = formatArcNetworkFee(21_000n, twentyGwei);
    expect(display).toBe('< $0.01');
    expect(display).not.toMatch(/ETH|Gwei|ARC/i);
  });

  it('formats an exact one-cent native fee as ~$0.01', () => {
    // 500_000 * 20 gwei = 1e16 wei = 0.01 USDC
    expect(formatArcNetworkFee(500_000n, twentyGwei)).toBe('~$0.01');
  });

  it('formats whole-dollar native fees as USD without floating-point math in the caller', () => {
    // 50_000_000 * 20 gwei = 1e18 wei = 1 USDC
    expect(formatArcNetworkFee(50_000_000n, twentyGwei)).toBe('~$1.00');
    // 75_000_000 * 20 gwei = 1.5 USDC
    expect(formatArcNetworkFee(75_000_000n, twentyGwei)).toBe('~$1.50');
  });

  it('formats native 18-decimal wei as a USDC amount', () => {
    // 21_000 * 20 gwei = 4.2e14 wei = 0.00042 USDC
    expect(formatArcNetworkFeeUsdc(21_000n, twentyGwei)).toBe('~0.00042 USDC');
  });

  it('keeps the helper copy USDC-native', () => {
    expect(ARC_NETWORK_FEE_HELPER).toBe('Paid in native USDC on Arc.');
  });

  it('stays bigint-safe for large gas limits', () => {
    const display = formatArcNetworkFee(10_000_000_000_000n, twentyGwei);
    expect(display.startsWith('~$')).toBe(true);
    expect(display).not.toMatch(/e\+|Infinity|NaN|ETH|Gwei/i);
  });
});

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