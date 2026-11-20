import { formatUnits, parseUnits } from 'viem';

/** Shared by the V2 buy and sell modals. */
export const SLIPPAGE_BPS = 250n;

export function parseUsdc(value: string): bigint | null {
  if (!/^\d*(?:\.\d{0,6})?$/.test(value)) return null;
  try {
    return value && Number(value) > 0 ? parseUnits(value, 6) : 0n;
  } catch {
    return null;
  }
}

export function formatUsdc(value: bigint | number | undefined, unit = 'USDC'): string {
  if (value === undefined) return '—';
  const n = typeof value === 'bigint' ? Number(formatUnits(value, 6)) : value;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`;
}

export function friendlyError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();
  if (lower.includes('user rejected') || lower.includes('user denied')) return 'Transaction cancelled in wallet.';
  if (lower.includes('slippage')) return 'The AMM price moved or liquidity is too thin. Try a smaller amount.';
  if (lower.includes('insufficient') || lower.includes('exceeds the balance')) return 'Insufficient balance for this transaction.';
  if (lower.includes('allowance')) return 'Allowance is too low. Please approve again.';
  if (lower.includes('exposurepaused')) return 'Trading on this market is paused right now.';
  if (lower.includes('marketunavailable') || lower.includes('invalidstate')) return 'This Arc V2 market is not open for trading.';
  if (lower.includes('failed to fetch') || lower.includes('network')) return 'Network error — please check your connection and try again.';
  const first = raw.split(/(?:Details:|Docs:|Contract Call:|Version:)/i)[0].trim();
  return first.length > 140 ? `${first.slice(0, 137)}…` : first || 'Something went wrong. Please try again.';
}
