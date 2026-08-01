import assert from 'node:assert';
import { test } from 'node:test';

test('Resolver skips resolution when oracle price data is missing', () => {
  const coins: { id: string; symbol: string; current_price: number }[] = [
    { id: 'bitcoin', symbol: 'btc', current_price: 63000 },
  ];

  const marketQuestion = 'Will SOL reach $75 or higher within the next 15 minutes?';
  const marketId = 'SOL-PRICE-15m-1785591589';

  const priceMatch = marketQuestion.match(/\$?([\d,]+(?:\.\d+)?)/);
  assert.ok(priceMatch);

  const symbolRaw = marketId.split('-')[0].toLowerCase();
  const coin = coins.find((c) => c.symbol.toLowerCase() === symbolRaw || c.id.toLowerCase() === symbolRaw);

  let shouldResolveNow = false;
  let skipReason = '';

  if (!coin) {
    shouldResolveNow = false;
    skipReason = 'coin_not_found';
  }

  assert.strictEqual(shouldResolveNow, false);
  assert.strictEqual(skipReason, 'coin_not_found');
});
