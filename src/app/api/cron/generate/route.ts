import { NextResponse } from 'next/server';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet, publicClient, ARCSIGNAL_ABI } from '@/lib/contracts';
import { getMarketsFromChain } from '@/lib/markets';
import { fetchCryptoMarkets } from '@/lib/coingecko';
import { fetchUpcomingFixtures } from '@/lib/apifootball';
import { generateCryptoAnalysis, generateFootballAnalysis } from '@/lib/gemini';
import type { Address } from 'viem';

// Always use the hardcoded correct deployed contract address
const CONTRACT_ADDRESS = '0x4f33115a18fe6a181be98610ddde3fab71efabed' as Address;


export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function resolutionTimestamp(hoursFromNow: number): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + hoursFromNow * 3600);
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

  if (!/^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS)) {
    return NextResponse.json({ error: 'Contract address missing or invalid' }, { status: 500 });
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ?? 'https://rpc.testnet.arc.network'),
  });

  const created: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  let totalCombinations = 0;
  const now = Math.floor(Date.now() / 1000);

  // Fetch full market data for accurate deduplication based on expiration
  const existingMarkets = await getMarketsFromChain();


  // CRYPTO MARKETS
  try {
    const requiredSymbols = ['BTC', 'ETH', 'SOL', 'XRP', 'SUI', 'AVAX'];
    const cryptoMarkets = await fetchCryptoMarkets();
    const marketsBySymbol = new Map(
      cryptoMarkets.map((coin) => [coin.symbol.toUpperCase(), coin]),
    );
    const selected = requiredSymbols
      .map((symbol) => marketsBySymbol.get(symbol))
      .filter((coin): coin is NonNullable<typeof coin> => Boolean(coin));

    const url = new URL(req.url);
    const onlyTimeframe = url.searchParams.get('timeframe');

    const allTimeframes = [
      { label: '5m',  minutes: 5 },
      { label: '15m', minutes: 15 },
      { label: '1h',  minutes: 60 },
      { label: '4h',  minutes: 240 },
      { label: '24h', minutes: 1440 },
    ];

    const timeframes = onlyTimeframe
      ? allTimeframes.filter(t => t.label === onlyTimeframe)
      : [allTimeframes[0]];
    
    totalCombinations = selected.length * timeframes.length;

    function getPriceTarget(current: number, timeframe: string): number {
      const multipliers: Record<string, number> = {
        '5m':  1.000,
        '15m': 1.003,
        '1h':  1.010,
        '4h':  1.020,
        '24h': 1.035,
      };
      const mult = multipliers[timeframe] ?? 1.015;
      const raw = current * mult;
      const magnitude = Math.pow(10, Math.floor(Math.log10(raw)) - 1);
      return Math.round(raw / magnitude) * magnitude;
    }

    function getSupportLevel(current: number): number {
      const raw = current * 0.997;
      const magnitude = Math.pow(10, Math.floor(Math.log10(raw)) - 1);
      return Math.round(raw / magnitude) * magnitude;
    }

    function getQuestion(symbol: string, current: number, target: number, timeframe: string): string {
      const fmt = (n: number) => n.toLocaleString('en-US');
      if (timeframe === '5m') return `Will ${symbol} hold above $${fmt(getSupportLevel(current))} over the next 5 minutes?`;
      if (timeframe === '15m') return `Will ${symbol} reach $${fmt(target)} or higher within the next 15 minutes?`;
      if (timeframe === '1h') return `Will ${symbol} break above $${fmt(target)} and close there within the next hour?`;
      if (timeframe === '4h') return `Will ${symbol} trade above $${fmt(target)} by the end of the next 4-hour candle?`;
      return `Will ${symbol} close above $${fmt(target)} on today\'s daily candle?`;
    }

    function getResolutionCriteria(symbol: string, current: number, target: number, timeframe: string, resolutionDate: string): string {
      const fmt = (n: number) => n.toLocaleString('en-US');
      if (timeframe === '5m') return `Resolves YES if ${symbol}/USD price on CoinGecko is at or above $${fmt(getSupportLevel(current))} at resolution time (${resolutionDate}). Resolves NO if price drops below $${fmt(getSupportLevel(current))}.`;
      if (timeframe === '15m') return `Resolves YES if ${symbol}/USD price on CoinGecko is at or above $${fmt(target)} at resolution time (${resolutionDate}). Current price at generation: $${fmt(current)}.`;
      if (timeframe === '1h') return `Resolves YES if ${symbol}/USD price on CoinGecko is above $${fmt(target)} at resolution time (${resolutionDate}). This represents a ~1% gain from the current price of $${fmt(current)}.`;
      if (timeframe === '4h') return `Resolves YES if ${symbol}/USD price on CoinGecko exceeds $${fmt(target)} at resolution time (${resolutionDate}). This represents approximately a 2% move from the current price of $${fmt(current)}.`;
      return `Resolves YES if ${symbol}/USD daily close price on CoinGecko is above $${fmt(target)} at resolution time (${resolutionDate}). Current price: $${fmt(current)}. Target represents ~3.5% gain.`;
    }

    let currentNonce = await publicClient.getTransactionCount({
      address: account.address,
      blockTag: 'pending',
    });

    for (const coin of selected) {
      for (const timeframe of timeframes) {
        const symbolUpper = coin.symbol.toUpperCase();

        const alreadyExists = existingMarkets.some(m =>
          m.marketId.includes(`${symbolUpper}-PRICE-${timeframe.label}-`) &&
          m.resolutionTime > now &&
          !m.resolved
        );
        if (alreadyExists) {
          skipped.push(`[SKIP] ${symbolUpper} ${timeframe.label} — active market exists`);
          continue;
        }

        const target = getPriceTarget(coin.current_price, timeframe.label);
        const resolutionTime = BigInt(now + timeframe.minutes * 60);
        const resolutionDate = new Date(Number(resolutionTime) * 1000).toUTCString();
        const question = getQuestion(symbolUpper, coin.current_price, target, timeframe.label);
        const marketId = `${symbolUpper}-PRICE-${timeframe.label}-${now}`;

        try {
          const analysis = await generateCryptoAnalysis({
            question,
            resolutionCriteria: getResolutionCriteria(symbolUpper, coin.current_price, target, timeframe.label, resolutionDate),
            resolutionTime: resolutionDate,
            cryptoData: {
              id: coin.id,
              symbol: coin.symbol,
              current_price: coin.current_price,
              price_change_percentage_24h: coin.price_change_percentage_24h,
              market_cap: coin.market_cap,
              total_volume: coin.total_volume,
              high_24h: coin.high_24h,
              low_24h: coin.low_24h,
              target_price: target,
            },
          });

          const analysisWithSubType = { ...analysis, subType: timeframe.label };

          const hash = await walletClient.writeContract({
            account,
            chain: arcTestnet,
            address: CONTRACT_ADDRESS,
            abi: ARCSIGNAL_ABI,
            functionName: 'createMarket',
            args: [marketId, 'CRYPTO', question, JSON.stringify(analysisWithSubType), resolutionTime],
            nonce: currentNonce++,
          });

          created.push(`[CRYPTO] ${question} (Tx: ${hash})`);
          // Pace transactions to prevent RPC 429 rate limits
          await new Promise(r => setTimeout(r, 1200));
        } catch (err) {
          errors.push(`[${symbolUpper}] ${timeframe.label}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  } catch (err) {
    errors.push(`[CRYPTO] CoinGecko fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // FOOTBALL MARKETS
  /*
  try {
    const wcFixtures = await fetchUpcomingFixtures([1], 2026);
    const fixtures = wcFixtures.length >= 3 ? wcFixtures : await fetchUpcomingFixtures();
    const selected = fixtures.slice(0, 6);

    for (const fixture of selected) {
      // Skip if an active non-expired market for this fixture already exists
      const alreadyExists = existingMarkets.some(m => 
        m.marketId.startsWith(`MATCH-${fixture.fixtureId}-`) &&
        (!m.resolved && m.resolutionTime > now)
      );
      if (alreadyExists) {
        created.push(`[SKIP] Match ${fixture.fixtureId} already exists`);
        continue;
      }

      const resolutionUnix = fixture.kickoffTime + 9000;
      const hoursFromNow = Math.max(1, Math.ceil((resolutionUnix - Date.now() / 1000) / 3600));
      const resolutionTime = resolutionTimestamp(hoursFromNow);
      const kickoffLabel = new Date(fixture.kickoffTime * 1000).toUTCString();
      const question = `Will ${fixture.homeTeam} beat ${fixture.awayTeam} on ${kickoffLabel}?`;
      const marketId = `MATCH-${fixture.fixtureId}-${now}`;

      try {
        const analysis = await generateFootballAnalysis({
          question,
          resolutionCriteria: `Resolves YES if ${fixture.homeTeam} wins at full time. Resolves NO if draw or ${fixture.awayTeam} wins.`,
          matchTime: kickoffLabel,
          fixtureData: {
            fixtureId: fixture.fixtureId,
            homeTeam: fixture.homeTeam,
            awayTeam: fixture.awayTeam,
            kickoffTime: kickoffLabel,
            round: fixture.round,
            leagueName: fixture.leagueName,
          },
        });

        const hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: ARCSIGNAL_ABI,
          functionName: 'createMarket',
          args: [marketId, 'FOOTBALL', question, JSON.stringify(analysis), resolutionTime],
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
  */

  return NextResponse.json({
    created,
    skipped,
    errors,
    summary: `${created.length} created, ${skipped.length} skipped, ${errors.length} failed`,
    totalCombinations,
  });
}
