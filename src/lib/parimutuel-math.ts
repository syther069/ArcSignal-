import { formatUnits } from 'viem';
import type { MarketStatus, MarketOutcome, MarketCategory } from './types';

export interface ParimutuelPnLResult {
  stakeUsdc: number;
  payout: number;
  netPnl: number;
  userWon: boolean | null;
}

/**
 * Derives canonical market status from resolution state, outcome, status string, and timestamps.
 */
export function deriveMarketStatus(params: {
  resolved: boolean;
  outcome: number;
  statusString?: string;
  resolutionTime: number;
  nowUnix?: number;
}): MarketStatus {
  const { resolved, outcome, statusString, resolutionTime } = params;
  const now = params.nowUnix ?? Math.floor(Date.now() / 1000);

  if (statusString === 'VOIDED' || (resolved && outcome === 0)) return 'VOIDED';
  if (statusString === 'RESOLVED' || resolved) return 'RESOLVED';
  if (statusString === 'CLOSED') return 'CLOSED';
  if (statusString === 'PENDING_RESOLUTION') return 'PENDING_RESOLUTION';
  return resolutionTime <= now ? 'PENDING_RESOLUTION' : 'OPEN';
}

/**
 * Maps raw numeric on-chain outcome to typed MarketOutcome.
 */
export function mapOutcome(resolved: boolean, outcome: number): MarketOutcome {
  if (!resolved) return 'PENDING';
  if (outcome === 1) return 'FOLLOW';
  if (outcome === 2) return 'FADE';
  return 'CANCELLED';
}

/**
 * Maps category string to valid MarketCategory.
 */
export function mapCategory(category: string): MarketCategory {
  const norm = category?.toUpperCase();
  if (norm === 'FOOTBALL') return 'FOOTBALL';
  return 'CRYPTO';
}

/**
 * Calculates user payout and net profit/loss according to the exact on-chain parimutuel formula:
 * Payout = UserStake + (UserStake * LosePool) / WinPool
 */
export function calculateParimutuelPnL(params: {
  side: 0 | 1;
  stakeRaw: bigint;
  resolved: boolean;
  outcome: number;
  followPool: bigint;
  fadePool: bigint;
}): ParimutuelPnLResult {
  const { side, stakeRaw, resolved, outcome, followPool, fadePool } = params;
  const stakeUsdc = Number(formatUnits(stakeRaw, 6));

  if (!resolved || outcome === 0) {
    return {
      stakeUsdc,
      payout: 0,
      netPnl: 0,
      userWon: null,
    };
  }

  const winningSide = outcome === 1 ? 0 : outcome === 2 ? 1 : -1;
  const userWon = winningSide >= 0 ? side === winningSide : null;

  if (userWon === true) {
    const winPool = winningSide === 0 ? followPool : fadePool;
    const losePool = winningSide === 0 ? fadePool : followPool;
    const effectiveWinPool = winPool > 0n ? winPool : 1n;

    // BigInt arithmetic preserves precision without floating point drift
    const profitRaw = (stakeRaw * losePool) / effectiveWinPool;
    const payoutRaw = stakeRaw + profitRaw;
    const payout = Number(formatUnits(payoutRaw, 6));
    const netPnl = payout - stakeUsdc;

    return {
      stakeUsdc,
      payout,
      netPnl,
      userWon: true,
    };
  }

  if (userWon === false) {
    return {
      stakeUsdc,
      payout: 0,
      netPnl: -stakeUsdc,
      userWon: false,
    };
  }

  return {
    stakeUsdc,
    payout: 0,
    netPnl: 0,
    userWon: null,
  };
}
