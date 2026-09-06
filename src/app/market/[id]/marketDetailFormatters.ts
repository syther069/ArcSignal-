import { formatUnits } from 'viem';

export interface FormatUsdcOptions {
  includeSuffix?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Unit-aware USDC presentation formatter specifically for individual market-detail pages and stake flow.
 * - Raw bigint values: formatted using 6 USDC decimals (formatUnits(val, 6)).
 * - Human-readable numeric or string values: formatted directly without 1,000,000x multiplication.
 * - Safely handles 0, 20, 20.50, raw 20_000_000n, and large pool values with standard locale commas.
 */
export function formatMarketDetailUSDC(
  value: bigint | number | string | null | undefined,
  options: FormatUsdcOptions = {}
): string {
  const {
    includeSuffix = true,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  if (value === null || value === undefined) {
    const formattedZero = (0).toLocaleString('en-US', {
      minimumFractionDigits,
      maximumFractionDigits,
    });
    return includeSuffix ? `${formattedZero} USDC` : formattedZero;
  }

  let numericVal: number;

  if (typeof value === 'bigint') {
    // Raw on-chain USDC value with 6 decimals
    numericVal = Number(formatUnits(value, 6));
  } else if (typeof value === 'number') {
    // Already human-readable numeric value
    numericVal = Number.isFinite(value) ? value : 0;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      numericVal = 0;
    } else {
      // Check if it looks like an integer raw bigint string (e.g. "20000000" with no decimal point, length >= 7)
      // BUT requirement states:
      // "Raw bigint values: format using 6 USDC decimals.
      //  Human-readable numeric/string values: format directly."
      // So if it's a string, parse directly as float.
      const parsed = parseFloat(trimmed);
      numericVal = Number.isFinite(parsed) ? parsed : 0;
    }
  } else {
    numericVal = 0;
  }

  const formatted = numericVal.toLocaleString('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  return includeSuffix ? `${formatted} USDC` : formatted;
}

/**
 * Converts any raw or human pool input into a normalized human number (USDC float).
 * Never double-scales.
 */
export function toHumanUsdcNumber(value: bigint | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'bigint') {
    return Number(formatUnits(value, 6));
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = parseFloat(String(value).trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Formats a pool multiplier with standard 2 decimal places (e.g. 2.45x).
 */
export function formatMultiplier(multiplier: number | string | null | undefined): string {
  if (multiplier === null || multiplier === undefined) return '2.00x';
  const num = typeof multiplier === 'number' ? multiplier : parseFloat(String(multiplier));
  if (!Number.isFinite(num) || num <= 0) return '2.00x';
  return `${num.toFixed(2)}x`;
}

/**
 * Formats pool percentages with clean rounding and bounds clamping.
 */
export function formatPercentage(percent: number | null | undefined, decimals = 0): string {
  if (percent === null || percent === undefined || !Number.isFinite(percent)) return '50%';
  const clamped = Math.min(100, Math.max(0, percent));
  return `${clamped.toFixed(decimals)}%`;
}
