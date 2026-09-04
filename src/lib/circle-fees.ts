import { formatUnits } from 'viem';

/**
 * Circle adapters currently return gas fees as either base-unit integers or
 * human-readable decimal strings. Normalize both shapes for display.
 */
export function formatCircleGasFee(value: string, decimals = 18) {
  const normalized = value.trim();
  if (!normalized) return null;

  try {
    const amount = /[.eE]/.test(normalized)
      ? Number(normalized)
      : Number(formatUnits(BigInt(normalized), decimals));

    if (!Number.isFinite(amount) || amount < 0) return null;
    return amount.toPrecision(3);
  } catch {
    return null;
  }
}
