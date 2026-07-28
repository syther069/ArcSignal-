import { NextResponse } from 'next/server';
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet, ARCSIGNAL_ABI } from '@/lib/contracts';
import { fetchCryptoMarkets } from '@/lib/coingecko';
import { fetchCompletedFixtures } from '@/lib/apifootball';
import type { Address } from 'viem';

export const dynamic = 'force-dynamic';

// Always use the hardcoded correct deployed contract address
const CONTRACT_ADDRESS = '0x4f33115a18fe6a181be98610ddde3fab71efabed' as Address;

// Use env RPC or fallback
const RPC_URL = process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ?? 'https://rpc.testnet.arc.network';

// Build a fresh publicClient that definitely uses the correct address
const resolvePublicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(RPC_URL),
});

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const privateKey = process.env.RESOLVER_PRIVATE_KEY;
  if (!privateKey) return NextResponse.json({ error: 'No resolver private key configured' }, { status: 500 });

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(RPC_URL),
  });

  const now = Math.floor(Date.now() / 1000);
  const resolved: string[] = [];
  const errors: string[] = [];
  const skipped: string[] = [];

  // ── 1. Fetch all market IDs ──────────────────────────────────────────────
  let allIds: string[] = [];
  try {
    allIds = (await resolvePublicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ARCSIGNAL_ABI,
      functionName: 'getAllMarketIds',
    })) as string[];
  } catch (err) {
    return NextResponse.json({
      error: `Failed to read market IDs: ${err instanceof Error ? err.message : String(err)}`,
      contractUsed: CONTRACT_ADDRESS,
    }, { status: 500 });
  }

  if (!allIds || allIds.length === 0) {
    return NextResponse.json({ resolved: [], skipped: [], errors: [], message: 'No markets found', contractUsed: CONTRACT_ADDRESS });
  }

  const targetIds = allIds.slice(-40);

  // ── 2. Pre-fetch live crypto prices once ─────────────────────────────────
  let coins: Awaited<ReturnType<typeof fetchCryptoMarkets>> = [];
  try {
    coins = await fetchCryptoMarkets();
  } catch (err) {
    errors.push(`CoinGecko fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 3. Pre-fetch completed football fixtures ──────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  let completedFixtures: Awaited<ReturnType<typeof fetchCompletedFixtures>> = [];
  try {
    completedFixtures = await fetchCompletedFixtures(1, 2026, yesterday, today);
  } catch (err) {
    errors.push(`Football fixtures fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }



  // ── 4. Loop through recent target markets ──────────────────────────────────
  for (const marketId of targetIds) {

    // Read the full market struct
    let market: {
      marketId: string;
      category: string;
      question: string;
      analysisJson: string;
      resolutionTime: bigint;
      followPool: bigint;
      fadePool: bigint;
      resolved: boolean;
      outcome: number;
    };

    try {
      // ABI returns a single tuple, viem unwraps it as an object with named fields
      const raw = await resolvePublicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'getMarket',
        args: [marketId],
      });
      // viem returns the tuple as an object matching the struct field names
      market = raw as typeof market;
    } catch (err) {
      errors.push(`${marketId}: failed to read market — ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    // Skip already-resolved markets
    if (market.resolved) {
      skipped.push(`${marketId}: already resolved`);
      continue;
    }

    const isExpired = Number(market.resolutionTime) <= now;

    // ── 5. Determine outcome ────────────────────────────────────────────────
    try {
      let outcome: 1 | 2 = 2; // default: Fade wins if we can't determine
      let outcomeReason = 'default (unable to determine outcome)';
      let shouldResolveNow = isExpired;

      const categoryNorm = market.category.toUpperCase();

      if (categoryNorm === 'CRYPTO') {
        const priceMatch = market.question.match(/\$?([\d,]+(?:\.\d+)?)/);
        if (priceMatch) {
          const targetPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
          const symbolRaw = marketId.split('-')[0].toLowerCase();
          const coin = coins.find(
            (c) => c.symbol.toLowerCase() === symbolRaw || c.id.toLowerCase() === symbolRaw
          );

          if (coin) {
            const is5m = marketId.includes('-5m-');
            
            if (is5m) {
              // 5m timeframe: "hold above" target.
              if (coin.current_price < targetPrice) {
                shouldResolveNow = true;
                outcome = 2; // Fade wins if it drops below support
                outcomeReason = `Dropped below support $${targetPrice} to $${coin.current_price}`;
              } else if (isExpired) {
                outcome = 1; // Follow wins if it held above until expiry
                outcomeReason = `Held above $${targetPrice} until expiry (current $${coin.current_price})`;
              }
            } else {
              // 15m, 1h, 4h, 24h timeframe: "reach" or "break above" target.
              if (coin.current_price >= targetPrice) {
                shouldResolveNow = true;
                outcome = 1; // Follow wins if it hits target early
                outcomeReason = `Hit target $${targetPrice} early (current $${coin.current_price})`;
              } else if (isExpired) {
                outcome = 2; // Fade wins if it never reached target by expiry
                outcomeReason = `Failed to reach $${targetPrice} by expiry (current $${coin.current_price})`;
              }
            }
          } else {
            if (isExpired) outcomeReason = `coin not found for symbol "${symbolRaw}", defaulting Fade wins`;
          }
        } else {
          if (isExpired) outcomeReason = `no price found in question: "${market.question}", defaulting Fade wins`;
        }

      } else if (categoryNorm === 'FOOTBALL') {
        if (isExpired) {
          const parts = marketId.split('-');
          const fixtureId = parseInt(parts[1]);
          if (!isNaN(fixtureId)) {
            const fixture = completedFixtures.find((f) => f.fixtureId === fixtureId);
            if (fixture && fixture.homeScore !== null && fixture.awayScore !== null) {
              outcome = fixture.homeScore > fixture.awayScore ? 1 : 2;
              outcomeReason = `fixture ${fixtureId}: ${fixture.homeScore}-${fixture.awayScore} → ${outcome === 1 ? 'Home wins (Follow)' : 'Away/Draw (Fade)'}`;
            } else {
              outcomeReason = `fixture ${fixtureId} not in completed list, defaulting Fade wins`;
            }
          } else {
            outcomeReason = `invalid fixtureId in marketId "${marketId}", defaulting Fade wins`;
          }
        }
      }

      if (!shouldResolveNow) {
        skipped.push(`${marketId}: not yet due and target not hit`);
        continue;
      }

      // ── 6. Call resolveMarket on-chain ────────────────────────────────────
      const hash = await walletClient.writeContract({
        account,
        chain: arcTestnet,
        address: CONTRACT_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'resolveMarket',
        args: [marketId, outcome],
      });

      await resolvePublicClient.waitForTransactionReceipt({ hash });
      resolved.push(`${marketId}: outcome=${outcome} (${outcomeReason}) tx=${hash}`);
      await new Promise(r => setTimeout(r, 500));

    } catch (err) {
      errors.push(`${marketId}: ${err instanceof Error ? err.message : String(err)}`);
      // Wait slightly on error to avoid 429 rate limits
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return NextResponse.json({
    contractUsed: CONTRACT_ADDRESS,
    marketCount: allIds.length,
    resolved,
    skipped,
    errors,
  });
}
