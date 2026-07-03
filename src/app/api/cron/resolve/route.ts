import { NextResponse } from 'next/server';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet, publicClient, ARCSIGNAL_ADDRESS, ARCSIGNAL_ABI } from '@/lib/contracts';
import { fetchCryptoMarkets } from '@/lib/coingecko';
import { fetchCompletedFixtures } from '@/lib/apifootball';
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

  const count = await publicClient.readContract({
    address: ARCSIGNAL_ADDRESS as Address,
    abi: ARCSIGNAL_ABI,
    functionName: 'getMarketCount',
  }) as bigint;

  if (!count || count === 0n) {
    return NextResponse.json({ resolved: [], errors: [], message: 'No markets found' });
  }

  const coins = await fetchCryptoMarkets();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  for (let i = 0; i < Number(count); i++) {
    const marketId = await publicClient.readContract({
      address: ARCSIGNAL_ADDRESS as Address,
      abi: ARCSIGNAL_ABI,
      functionName: 'getMarketIdByIndex',
      args: [BigInt(i)],
    }) as string;

    const market = await publicClient.readContract({
      address: ARCSIGNAL_ADDRESS as Address,
      abi: ARCSIGNAL_ABI,
      functionName: 'getMarket',
      args: [marketId],
    }) as {
      marketId: string;
      category: string;
      question: string;
      resolutionTime: bigint;
      resolved: boolean;
      outcome: number;
    };

    if (market.resolved || Number(market.resolutionTime) > now) continue;

    try {
      let outcome: 0 | 1 = 1;

      if (market.category === 'CRYPTO') {
        const symbol = marketId.split('-')[0].toLowerCase();
        const coin = coins.find(c => c.symbol.toLowerCase() === symbol);
        if (coin) {
          const match = market.question.match(/\$([0-9,]+)/);
          if (match) {
            const target = parseFloat(match[1].replace(/,/g, ''));
            outcome = coin.current_price > target ? 0 : 1;
          }
        }
      } else if (market.category === 'FOOTBALL') {
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
