import { describe, it, expect } from 'vitest';
import { calculateParimutuelPnL, deriveMarketStatus, mapOutcome, mapCategory } from '@/lib/parimutuel-math';

describe('Parimutuel Math & Status Calculations', () => {
  describe('calculateParimutuelPnL', () => {
    it('returns zero pnl and null userWon for unresolved markets', () => {
      const result = calculateParimutuelPnL({
        side: 0,
        stakeRaw: 100_000_000n, // 100 USDC
        resolved: false,
        outcome: 0,
        followPool: 500_000_000n,
        fadePool: 500_000_000n,
      });

      expect(result.stakeUsdc).toBe(100);
      expect(result.payout).toBe(0);
      expect(result.netPnl).toBe(0);
      expect(result.userWon).toBeNull();
    });

    it('calculates correct winning payout when user follows side 0 (Follow) and outcome is 1', () => {
      // 100 stake on follow. followPool = 200, fadePool = 300.
      // Win pool = 200, lose pool = 300.
      // Profit = 100 * 300 / 200 = 150. Payout = 250 USDC. Net PnL = +150 USDC.
      const result = calculateParimutuelPnL({
        side: 0,
        stakeRaw: 100_000_000n,
        resolved: true,
        outcome: 1,
        followPool: 200_000_000n,
        fadePool: 300_000_000n,
      });

      expect(result.stakeUsdc).toBe(100);
      expect(result.payout).toBe(250);
      expect(result.netPnl).toBe(150);
      expect(result.userWon).toBe(true);
    });

    it('calculates correct winning payout when user fades side 1 (Fade) and outcome is 2', () => {
      // 50 stake on fade. followPool = 100, fadePool = 50.
      // Win pool = 50, lose pool = 100.
      // Profit = 50 * 100 / 50 = 100. Payout = 150 USDC. Net PnL = +100 USDC.
      const result = calculateParimutuelPnL({
        side: 1,
        stakeRaw: 50_000_000n,
        resolved: true,
        outcome: 2,
        followPool: 100_000_000n,
        fadePool: 50_000_000n,
      });

      expect(result.stakeUsdc).toBe(50);
      expect(result.payout).toBe(150);
      expect(result.netPnl).toBe(100);
      expect(result.userWon).toBe(true);
    });

    it('returns loss when user bet on the losing side', () => {
      const result = calculateParimutuelPnL({
        side: 0,
        stakeRaw: 100_000_000n,
        resolved: true,
        outcome: 2, // Fade won
        followPool: 200_000_000n,
        fadePool: 300_000_000n,
      });

      expect(result.stakeUsdc).toBe(100);
      expect(result.payout).toBe(0);
      expect(result.netPnl).toBe(-100);
      expect(result.userWon).toBe(false);
    });
  });

  describe('deriveMarketStatus', () => {
    const now = 1700000000;

    it('derives VOIDED if outcome is 0 and resolved', () => {
      expect(deriveMarketStatus({ resolved: true, outcome: 0, resolutionTime: now - 100, nowUnix: now })).toBe('VOIDED');
      expect(deriveMarketStatus({ resolved: false, outcome: 0, statusString: 'VOIDED', resolutionTime: now + 100, nowUnix: now })).toBe('VOIDED');
    });

    it('derives RESOLVED if resolved is true', () => {
      expect(deriveMarketStatus({ resolved: true, outcome: 1, resolutionTime: now - 100, nowUnix: now })).toBe('RESOLVED');
    });

    it('derives PENDING_RESOLUTION if time has passed but not resolved', () => {
      expect(deriveMarketStatus({ resolved: false, outcome: 0, resolutionTime: now - 50, nowUnix: now })).toBe('PENDING_RESOLUTION');
    });

    it('derives OPEN if time is in future and unresolved', () => {
      expect(deriveMarketStatus({ resolved: false, outcome: 0, resolutionTime: now + 500, nowUnix: now })).toBe('OPEN');
    });
  });

  describe('mapOutcome & mapCategory', () => {
    it('maps outcomes accurately', () => {
      expect(mapOutcome(false, 0)).toBe('PENDING');
      expect(mapOutcome(true, 1)).toBe('FOLLOW');
      expect(mapOutcome(true, 2)).toBe('FADE');
      expect(mapOutcome(true, 0)).toBe('CANCELLED');
    });

    it('maps categories cleanly', () => {
      expect(mapCategory('FOOTBALL')).toBe('FOOTBALL');
      expect(mapCategory('football')).toBe('FOOTBALL');
      expect(mapCategory('CRYPTO')).toBe('CRYPTO');
      expect(mapCategory('unknown')).toBe('CRYPTO');
    });
  });
});
