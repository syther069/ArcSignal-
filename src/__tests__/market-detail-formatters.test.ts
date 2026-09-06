import { describe, it, expect } from 'vitest';
import {
  formatMarketDetailUSDC,
  toHumanUsdcNumber,
  formatMultiplier,
  formatPercentage,
} from '@/app/market/[id]/marketDetailFormatters';

describe('formatMarketDetailUSDC', () => {
  it('formats 0 as 0.00 USDC', () => {
    expect(formatMarketDetailUSDC(0)).toBe('0.00 USDC');
    expect(formatMarketDetailUSDC(0n)).toBe('0.00 USDC');
    expect(formatMarketDetailUSDC('0')).toBe('0.00 USDC');
    expect(formatMarketDetailUSDC(null)).toBe('0.00 USDC');
    expect(formatMarketDetailUSDC(undefined)).toBe('0.00 USDC');
  });

  it('formats human-readable 20 as 20.00 USDC', () => {
    expect(formatMarketDetailUSDC(20)).toBe('20.00 USDC');
    expect(formatMarketDetailUSDC('20')).toBe('20.00 USDC');
  });

  it('formats human-readable 20.50 as 20.50 USDC', () => {
    expect(formatMarketDetailUSDC(20.5)).toBe('20.50 USDC');
    expect(formatMarketDetailUSDC('20.50')).toBe('20.50 USDC');
  });

  it('formats raw on-chain 20,000,000 bigint with 6 decimals as 20.00 USDC', () => {
    const rawOnChainBigInt = 20_000_000n;
    expect(formatMarketDetailUSDC(rawOnChainBigInt)).toBe('20.00 USDC');
  });

  it('never multiplies an already human-readable value by 1,000,000', () => {
    const humanValue = 20;
    const formatted = formatMarketDetailUSDC(humanValue);
    expect(formatted).not.toContain('20,000,000');
    expect(formatted).toBe('20.00 USDC');
  });

  it('formats large pool values cleanly with standard locale commas', () => {
    expect(formatMarketDetailUSDC(1_250_000.5)).toBe('1,250,000.50 USDC');
    expect(formatMarketDetailUSDC(1_250_000_500_000n)).toBe('1,250,000.50 USDC');
  });

  it('supports options to omit suffix', () => {
    expect(formatMarketDetailUSDC(20, { includeSuffix: false })).toBe('20.00');
    expect(formatMarketDetailUSDC(20_000_000n, { includeSuffix: false })).toBe('20.00');
  });
});

describe('toHumanUsdcNumber', () => {
  it('converts bigint, number, and string correctly without double scaling', () => {
    expect(toHumanUsdcNumber(0)).toBe(0);
    expect(toHumanUsdcNumber(0n)).toBe(0);
    expect(toHumanUsdcNumber(20)).toBe(20);
    expect(toHumanUsdcNumber(20_000_000n)).toBe(20);
    expect(toHumanUsdcNumber('20.5')).toBe(20.5);
  });
});

describe('formatMultiplier & formatPercentage', () => {
  it('formats multipliers with 2 decimals and suffix', () => {
    expect(formatMultiplier(2)).toBe('2.00x');
    expect(formatMultiplier(1.854)).toBe('1.85x');
    expect(formatMultiplier(0)).toBe('2.00x');
    expect(formatMultiplier(null)).toBe('2.00x');
  });

  it('formats percentages cleanly', () => {
    expect(formatPercentage(65.4)).toBe('65%');
    expect(formatPercentage(65.4, 1)).toBe('65.4%');
    expect(formatPercentage(null)).toBe('50%');
  });
});
