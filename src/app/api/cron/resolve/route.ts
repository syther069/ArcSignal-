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

  // ── 1. Get total market count ──────────────────────────────────────────────
  let count: bigint;
  try {
    count = await resolvePublicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ARCSIGNAL_ABI,
      functionName: 'getMarketCount',
    }) as bigint;
  } catch (err) {
    return NextResponse.json({
      error: `Failed to read market count: ${err instanceof Error ? err.message : String(err)}`,
      contractUsed: CONTRACT_ADDRESS,
    }, { status: 500 });
  }

  if (!count || count === 0n) {
    return NextResponse.json({ resolved: [], skipped: [], errors: [], message: 'No markets found', contractUsed: CONTRACT_ADDRESS });
  }

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

  // ── 4. Loop through every market ──────────────────────────────────────────
  for (let i = 0; i < Number(count); i++) {
    let marketId: string;
    try {
      marketId = await resolvePublicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'getMarketIdByIndex',
        args: [BigInt(i)],
      }) as string;
    } catch (err) {
      errors.push(`Index ${i}: failed to read marketId — ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

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

    // Skip already-resolved markets or those whose resolution time hasn't arrived yet
    if (market.resolved) {
      skipped.push(`${marketId}: already resolved`);
      continue;
    }
    if (Number(market.resolutionTime) > now) {
      skipped.push(`${marketId}: not yet due (resolves at ${new Date(Number(market.resolutionTime) * 1000).toISOString()})`);
      continue;
    }

    // ── 5. Determine outcome ────────────────────────────────────────────────
    //   outcome 1 = Follow wins (AI prediction correct)
    //   outcome 2 = Fade wins  (AI prediction wrong)
    try {
      let outcome: 1 | 2 = 2; // default: Fade wins if we can't determine
      let outcomeReason = 'default (unable to determine outcome)';

      const categoryNorm = market.category.toUpperCase();

      if (categoryNorm === 'CRYPTO') {
        // Extract target price from the market question
        // Handles patterns like: "$105,000", "$105000", "105,000", "105000"
        const priceMatch = market.question.match(/\$?([\d,]+(?:\.\d+)?)/);
        if (priceMatch) {
          const targetPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
          // Extract symbol from marketId (e.g. "btc-crypto-1234" → "btc")
          const symbolRaw = marketId.split('-')[0].toLowerCase();
          const coin = coins.find(
            (c) => c.symbol.toLowerCase() === symbolRaw || c.id.toLowerCase() === symbolRaw
          );

          if (coin) {
            // outcome 1 = Follow wins = AI was right = price is ABOVE target
            outcome = coin.current_price > targetPrice ? 1 : 2;
            outcomeReason = `${coin.symbol.toUpperCase()} price $${coin.current_price} vs target $${targetPrice} → ${outcome === 1 ? 'ABOVE (Follow wins)' : 'BELOW (Fade wins)'}`;
          } else {
            outcomeReason = `coin not found for symbol "${symbolRaw}", defaulting Fade wins`;
          }
        } else {
          outcomeReason = `no price found in question: "${market.question}", defaulting Fade wins`;
        }

      } else if (categoryNorm === 'FOOTBALL') {
        // Extract fixture ID from marketId (e.g. "football-12345-...")
        const parts = marketId.split('-');
        const fixtureId = parseInt(parts[1]);
        if (!isNaN(fixtureId)) {
          const fixture = completedFixtures.find((f) => f.fixtureId === fixtureId);
          if (fixture && fixture.homeScore !== null && fixture.awayScore !== null) {
            // outcome 1 = Follow wins = home team won
            outcome = fixture.homeScore > fixture.awayScore ? 1 : 2;
            outcomeReason = `fixture ${fixtureId}: ${fixture.homeScore}-${fixture.awayScore} → ${outcome === 1 ? 'Home wins (Follow)' : 'Away/Draw (Fade)'}`;
          } else {
            outcomeReason = `fixture ${fixtureId} not in completed list, defaulting Fade wins`;
          }
        } else {
          outcomeReason = `invalid fixtureId in marketId "${marketId}", defaulting Fade wins`;
        }
      }

      // ── 6. Call resolveMarket on-chain ────────────────────────────────────
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'resolveMarket',
        args: [marketId, outcome],
      });

      // ── 7. Wait and verify the transaction succeeded ─────────────────────
      const receipt = await resolvePublicClient.waitForTransactionReceipt({
        hash,
        timeout: 60_000,
      });

      if (receipt.status !== 'success') {
        errors.push(`${marketId}: tx ${hash} was REVERTED (status=${receipt.status})`);
      } else {
        resolved.push(`${marketId}: outcome=${outcome} (${outcomeReason}) tx=${hash}`);
      }

    } catch (err) {
      errors.push(`${marketId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    contractUsed: CONTRACT_ADDRESS,
    marketCount: Number(count),
    resolved,
    skipped,
    errors,
  });
}
