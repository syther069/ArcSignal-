import { NextResponse } from 'next/server';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet, publicClient, ARCSIGNAL_ADDRESS, ARCSIGNAL_ABI } from '@/lib/contracts';
import { fetchCryptoMarkets } from '@/lib/coingecko';
import { fetchUpcomingFixtures } from '@/lib/apifootball';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

function resolutionTimestamp(hoursFromNow: number): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + hoursFromNow * 3600);
}

function priceTarget(current: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(current)) - 1);
  return Math.round((current * 1.015) / magnitude) * magnitude;
}

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const privateKey = process.env.RESOLVER_PRIVATE_KEY;
  if (!privateKey || !/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    return NextResponse.json({ error: 'RESOLVER_PRIVATE_KEY missing or invalid' }, { status: 500 });
  }

  if (!ARCSIGNAL_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(ARCSIGNAL_ADDRESS)) {
    return NextResponse.json({ error: 'Contract address missing or invalid' }, { status: 500 });
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL),
  });

  const created: string[] = [];
  const errors: string[] = [];

  // CRYPTO MARKETS
  try {
    const coins = await fetchCryptoMarkets();
    const selected = coins.slice(0, 6);
    const hours = [15, 18, 22, 15, 18, 22];

    for (let i = 0; i < selected.length; i++) {
      const coin = selected[i];
      const target = priceTarget(coin.current_price);
      const h = hours[i];
      const resolutionTime = resolutionTimestamp(h);
      const resolutionDate = new Date(Number(resolutionTime) * 1000).toUTCString();
      const question = `Will ${coin.symbol.toUpperCase()} close above $${target.toLocaleString('en-US')} by ${resolutionDate}?`;

      try {
        const hash = await walletClient.writeContract({
          address: ARCSIGNAL_ADDRESS,
          abi: ARCSIGNAL_ABI,
          functionName: 'createMarket',
          args: [question, 'CRYPTO', resolutionTime],
        });
        await publicClient.waitForTransactionReceipt({ hash });
        created.push(`[CRYPTO] ${question}`);
      } catch (err) {
        errors.push(`[CRYPTO] ${coin.symbol}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    errors.push(`[CRYPTO] CoinGecko fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // FOOTBALL MARKETS
  try {
    const wcFixtures = await fetchUpcomingFixtures([1], 2026);
    const fixtures = wcFixtures.length >= 3 ? wcFixtures : await fetchUpcomingFixtures();
    const selected = fixtures.slice(0, 6);

    for (const fixture of selected) {
      const resolutionUnix = fixture.kickoffTime + 9000;
      const hoursFromNow = Math.max(1, Math.ceil((resolutionUnix - Date.now() / 1000) / 3600));
      const resolutionTime = resolutionTimestamp(hoursFromNow);
      const kickoffLabel = new Date(fixture.kickoffTime * 1000).toUTCString();
      const question = `Will ${fixture.homeTeam} beat ${fixture.awayTeam} on ${kickoffLabel}? [fixtureId:${fixture.fixtureId}]`;

      try {
        const hash = await walletClient.writeContract({
          address: ARCSIGNAL_ADDRESS,
          abi: ARCSIGNAL_ABI,
          functionName: 'createMarket',
          args: [question, 'FOOTBALL', resolutionTime],
        });
        await publicClient.waitForTransactionReceipt({ hash });
        created.push(`[FOOTBALL] ${question}`);
      } catch (err) {
        errors.push(`[FOOTBALL] ${fixture.homeTeam} vs ${fixture.awayTeam}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    errors.push(`[FOOTBALL] Fixtures fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return NextResponse.json({ created, errors, summary: `${created.length} markets created, ${errors.length} failed` });
}
