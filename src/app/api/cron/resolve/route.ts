import { NextResponse } from 'next/server';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet, publicClient, ARCSIGNAL_ADDRESS, ARCSIGNAL_ABI } from '@/lib/contracts';
import { fetchCryptoMarkets } from '@/lib/coingecko';
import { fetchCompletedFixtures } from '@/lib/apifootball';
import { getMarketsFromChain } from '@/lib/markets';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const privateKey = process.env.RESOLVER_PRIVATE_KEY;
  if (!privateKey) return NextResponse.json({ error: 'No private key' }, { status: 500 });

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http(process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL) });

  const now = Math.floor(Date.now() / 1000);
  const resolved: string[] = [];
  const errors: string[] = [];

  const markets = await getMarketsFromChain();
  const coins = await fetchCryptoMarkets();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  for (const market of markets) {
    if (market.resolved || market.resolutionTime > now) continue;

    try {
      let outcome: 0 | 1 = 1;

      if (market.category === 'CRYPTO') {
        const match = market.question.match(/Will (\w+) close above \$([\d,]+)/);
        if (match) {
          const symbol = match[1].toLowerCase();
          const target = parseFloat(match[2].replace(/,/g, ''));
          const coin = coins.find(c => c.symbol.toLowerCase() === symbol);
          if (coin) outcome = coin.current_price > target ? 0 : 1;
        }
      } else if (market.category === 'FOOTBALL') {
        const fixtureIdMatch = market.question.match(/\[fixtureId:(\d+)\]/);
        if (fixtureIdMatch) {
          const fixtureId = parseInt(fixtureIdMatch[1]);
          const completed = await fetchCompletedFixtures(1, 2026, yesterday, today);
          const fixture = completed.find(f => f.fixtureId === fixtureId);
          if (fixture && fixture.homeScore !== null && fixture.awayScore !== null) {
            outcome = fixture.homeScore > fixture.awayScore ? 0 : 1;
          }
        }
      }

      const hash = await walletClient.writeContract({
        address: ARCSIGNAL_ADDRESS, abi: ARCSIGNAL_ABI,
        functionName: 'resolveMarket', args: [market.marketId, outcome],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      resolved.push(`Market ${market.marketId}: outcome ${outcome}`);
    } catch (err) {
      errors.push(`Market ${market.marketId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ resolved, errors });
}
