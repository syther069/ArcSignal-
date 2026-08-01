import assert from 'node:assert';
import { test } from 'node:test';

// Test position parsing logic with hyphenated market IDs
test('positionsByMarket correctly parses hyphenated market IDs and maps outcomes', () => {
  const mockLogs = [
    { args: { user: '0x123', marketId: 'BTC-PRICE-5m-1785591589', side: 0 } },
    { args: { user: '0x123', marketId: 'ETH-PRICE-15m-1785591589', side: 1 } },
    { args: { user: '0x999', marketId: 'BTC-PRICE-5m-1785591589', side: 1 } },
  ];

  const targetAddress = '0x123';
  const positionsByMarket = new Map<string, Set<number>>();

  for (const log of mockLogs) {
    const { user, marketId, side } = log.args;
    if (user.toLowerCase() !== targetAddress.toLowerCase()) continue;
    if (!positionsByMarket.has(marketId)) {
      positionsByMarket.set(marketId, new Set());
    }
    positionsByMarket.get(marketId)!.add(Number(side));
  }

  // Check unique market IDs preserved intact
  assert.deepStrictEqual([...positionsByMarket.keys()], [
    'BTC-PRICE-5m-1785591589',
    'ETH-PRICE-15m-1785591589',
  ]);

  // Check outcome mapping (on-chain 1 -> side 0 (Follow), on-chain 2 -> side 1 (Fade))
  const checkWinningSide = (outcome: number) => (outcome === 1 ? 0 : outcome === 2 ? 1 : -1);

  // Market 1 outcome = 1 (Follow wins). User staked side 0 (Follow). Should count as winning.
  const btcWinningSide = checkWinningSide(1);
  assert.strictEqual(positionsByMarket.get('BTC-PRICE-5m-1785591589')?.has(btcWinningSide), true);

  // Market 2 outcome = 1 (Follow wins). User staked side 1 (Fade). Should NOT count.
  const ethWinningSide = checkWinningSide(1);
  assert.strictEqual(positionsByMarket.get('ETH-PRICE-15m-1785591589')?.has(ethWinningSide), false);
});
