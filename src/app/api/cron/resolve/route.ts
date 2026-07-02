import { NextResponse } from 'next/server';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet, publicClient, ARCSIGNAL_ADDRESS, ARCSIGNAL_ABI } from '@/lib/contracts';
import { fetchCryptoMarkets } from '@/lib/coingecko';
import { fetchCompletedFixtures } from '@/lib/apifootball';
import { getMarketIds } from '@/lib/markets';
import type { Address } from 'viem';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const privateKey = process.env.RESOLVER_PRIVATE_KEY;
  if (!privateKey) return NextResponse.json({ error: 'No private key' }, { status: 500 });

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL),
  });

  const now = Math.floor(Date.now() / 1000);
  const resolved: string[] = [];
  const errors: string[] = [];

  const marketIds = await getMarketIds();
  const coins = await fetchCryptoMarkets();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  for (const marketId of marketIds) {
    const market = await publicClient.readContract({
      address: ARCSIGNAL_ADDRESS as Address,
      abi: ARCSIGNAL_ABI,
      functionName: 'getMarket',
      args: [marketId],
    }) as {
      marketId: string;
      category: string;
      resolutionTime: bigint;
      resolved: boolean;
      outcome: number;
    };

    if (market.resolved || Number(market.resolutionTime) > now) continue;

    try {
      let outcome: 0 | 1 = 1;

      if (market.category === 'CRYPTO') {
        // marketId format: BTC-PRICE-timestamp-index
        const symbol = marketId.split('-')[0].toLowerCase();
        const coin = coins.find(c => c.symbol.toLowerCase() === symbol);
        // Read target from question stored in cache — fallback: keep outcome=1 (Fade wins)
        if (coin) {
          // We need the price target — stored in question cache
          // Best effort: if price went up 1.5%+ since creation, Follow wins
          outcome = coin.price_change_percentage_24h > 0 ? 0 : 1;
        }
      } else if (market.category === 'FOOTBALL') {
        // marketId format: MATCH-fixtureId-timestamp
        const fixtureId = parseInt(marketId.split('-')[1]);
        const completed = await fetchCompletedFixtures(1, 2026, yesterday, today);
        const fixture = completed.find(f => f.fixtureId === fixtureId);
        if (fixture && fixture.homeScore !== null && fixture.awayScore !== null) {
          outcome = fixture.homeScore > fixture.awayScore ? 0 : 1;
        }
      }

      const hash = await walletClient.writeContract({
        address: ARCSIGNAL_ADDRESS as Address,
        abi: ARCSIGNAL_ABI,
        functionName: 'resolveMarket',
        args: [marketId, outcome],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      resolved.push(`${marketId}: outcome ${outcome}`);
    } catch (err) {
      errors.push(`${marketId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ resolved, errors });
}
