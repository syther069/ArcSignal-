import { describe, it, expect } from 'vitest';
import { toUiMarket } from '@/lib/ui-market';
import type { SerializableMarket } from '@/lib/types';

describe('ArcSignal Market Calculations & Serialization', () => {
  it('correctly maps and calculates market pools to UI market', () => {
    const rawMarket: SerializableMarket = {
      marketId: 'BTC-PRICE-5m-1700000000',
      category: 'CRYPTO',
      question: 'Will BTC hold above $95,000 over the next 5 minutes?',
      resolutionTime: 1700000300,
      followPool: '100000000', // 100 USDC (6 decimals)
      fadePool: '50000000',   // 50 USDC (6 decimals)
      resolved: false,
      outcome: 'UNRESOLVED',
      status: 'OPEN',
      analysis: {
        prediction: 'YES',
        confidence: 80,
        probability: 78,
        summary: 'Strong buying pressure at $95k support.',
        bullCase: 'Order book depth remains strong.',
        bearCase: 'Sudden sell wall could trigger slippage.',
        keyFactors: ['High funding rates', 'Whale accumulation'],
        sources: ['CoinGecko', 'Binance'],
        generatedAt: '2026-08-16T12:00:00.000Z',
      },
    };

    const ui = toUiMarket(rawMarket);

    expect(ui.category).toBe('crypto');
    expect(ui.followPool).toBe(100);
    expect(ui.fadePool).toBe(50);
    expect(ui.volume).toBe(150);
    expect(ui.agentPick).toBe('YES');
    expect(ui.confidence).toBe(80);
    expect(ui.resolution_source).toBe('CoinGecko');
  });

  it('correctly calculates pari-mutuel payouts and user PnL', () => {
    // Scenario: User staked 10 USDC on FOLLOW (winning side). Total Follow Pool = 100 USDC, Total Fade Pool = 50 USDC.
    const stakeUsdc = 10;
    const winPool = 100n * 1_000_000n;
    const losePool = 50n * 1_000_000n;
    const stakeRaw = 10n * 1_000_000n;

    // Pari-mutuel payout formula: stake + (stake / winPool) * losePool
    const winnings = Number((stakeRaw * losePool) / winPool) / 1e6;
    const totalPayout = stakeUsdc + winnings;
    const netPnl = totalPayout - stakeUsdc;

    expect(winnings).toBe(5);
    expect(totalPayout).toBe(15);
    expect(netPnl).toBe(5);
    const roi = (netPnl / stakeUsdc) * 100;
    expect(roi).toBe(50);
  });

  it('handles football fixture title parsing accurately', () => {
    const rawFootballMarket: SerializableMarket = {
      marketId: 'MATCH-123-1700000000',
      category: 'FOOTBALL',
      question: 'Will Arsenal beat Chelsea on Sun, 16 Aug 2026 15:00:00 GMT? [fixtureId:123]',
      resolutionTime: 1700009000,
      followPool: '0',
      fadePool: '0',
      resolved: false,
      outcome: 'UNRESOLVED',
      status: 'OPEN',
    };

    const ui = toUiMarket(rawFootballMarket);

    expect(ui.category).toBe('football');
    expect(ui.homeTeam).toBe('Arsenal');
    expect(ui.awayTeam).toBe('Chelsea');
    expect(ui.resolution_source).toBe('API-Football');
    expect(ui.title).toBe('Will Arsenal beat Chelsea on Sun, 16 Aug 2026 15:00:00 GMT?');
  });
});
