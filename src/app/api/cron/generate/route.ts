import { NextResponse } from 'next/server';
import { createWalletClient, decodeEventLog, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet, publicClient, ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import { fetchCryptoMarkets } from '@/lib/coingecko';
import { fetchUpcomingFixtures } from '@/lib/apifootball';
import { generateCryptoAnalysis, generateFootballAnalysis } from '@/lib/gemini';
import { authorizeCronRequest } from '@/lib/cron-auth';
import type { Hash } from 'viem';
import {
  assertFreshGenerationObservation,
  ORACLE_POLICY_VERSION,
} from '@/lib/oracle-policy';

const CONTRACT_ADDRESS = ARCSIGNAL_ADDRESS;


export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function resolutionTimestamp(hoursFromNow: number): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + hoursFromNow * 3600);
}

export async function POST(req: Request) {
  const authorization = authorizeCronRequest(req);
  if (!authorization.ok) return authorization.response;

  if (process.env.ENABLE_MARKET_AUTOMATION === 'false') {
    return NextResponse.json({ error: 'Market automation is disabled' }, { status: 503 });
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
    transport: http(
      process.env.ARC_RPC_URL
      ?? process.env.ARC_TESTNET_RPC_URL
      ?? process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL
      ?? 'https://rpc.testnet.arc.network',
    ),
  });

  const created: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  let totalCombinations = 0;
  const now = Math.floor(Date.now() / 1000);

  // CRYPTO MARKETS
  try {
    const requiredSymbols = ['BTC', 'ETH', 'SOL', 'XRP', 'SUI', 'AVAX'];
    let cryptoMarkets: any[] = [];
    try {
      cryptoMarkets = await fetchCryptoMarkets();
    } catch (e) {
      console.error('All live crypto price feeds failed:', e);
      throw new Error(`Live price feeds unavailable across all providers: ${e instanceof Error ? e.message : String(e)}`);
    }

    const marketsBySymbol = new Map(
      cryptoMarkets.map((coin) => [coin.symbol.toUpperCase(), coin]),
    );
    const selected = requiredSymbols
      .map((symbol) => marketsBySymbol.get(symbol))
      .filter((coin): coin is NonNullable<typeof coin> => Boolean(coin));
    if (selected.some((coin) => coin.price_source !== 'coingecko')) {
      throw new Error('CoinGecko is unavailable; refusing to create markets from a fallback oracle');
    }
    const observationCheckTime = Math.floor(Date.now() / 1000);
    for (const coin of selected) {
      assertFreshGenerationObservation({
        provider: coin.price_source,
        symbol: coin.symbol,
        price: coin.current_price,
        observedAt: coin.price_observed_at,
      }, observationCheckTime);
    }

    const url = new URL(req.url);
    let onlyTimeframe = url.searchParams.get('timeframe');
    if (!onlyTimeframe) {
      try {
        const body = await req.clone().json();
        onlyTimeframe = body?.timeframe;
      } catch {}
    }
    if (!onlyTimeframe) onlyTimeframe = '5m';

    const allTimeframes = [
      { label: '5m',  minutes: 5 },
      { label: '15m', minutes: 15 },
      { label: '1h',  minutes: 60 },
      { label: '4h',  minutes: 240 },
      { label: '24h', minutes: 1440 },
    ];

    const timeframes = onlyTimeframe === 'all'
      ? allTimeframes
      : allTimeframes.filter(t => t.label === onlyTimeframe);
    
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

    function getQuestion(symbol: string, threshold: number, timeframe: string): string {
      const fmt = (n: number) => n.toLocaleString('en-US');
      return `Will ${symbol} be at or above $${fmt(threshold)} at the end of the next ${timeframe}?`;
    }

    function getResolutionCriteria(symbol: string, threshold: number, resolutionDate: string): string {
      const fmt = (n: number) => n.toLocaleString('en-US');
      return `Resolves YES if ${symbol}/USD on CoinGecko is at or above $${fmt(threshold)} at ${resolutionDate}; otherwise resolves NO.`;
    }

    const jobs: { coin: any; timeframe: any; threshold: number; resolutionTime: bigint; resolutionDate: string; question: string; marketId: string; }[] = [];

    for (const coin of selected) {
      for (const timeframe of timeframes) {
        const symbolUpper = coin.symbol.toUpperCase();

        const target = getPriceTarget(coin.current_price, timeframe.label);
        const threshold = timeframe.label === '5m'
          ? getSupportLevel(coin.current_price)
          : target;
        const resolutionTime = BigInt(now + timeframe.minutes * 60);
        const resolutionDate = new Date(Number(resolutionTime) * 1000).toUTCString();
        const question = getQuestion(symbolUpper, threshold, timeframe.label);
        const marketId = `${symbolUpper}-PRICE-${timeframe.label}-${now}`;

        jobs.push({ coin, timeframe, threshold, resolutionTime, resolutionDate, question, marketId });
      }
    }

    if (jobs.length > 0) {
      console.log(`Generating ${jobs.length} crypto market analyses via Gemini in parallel...`);
      const analysisResults = await Promise.allSettled(
        jobs.map(async (job) => {
          const analysis = await generateCryptoAnalysis({
            question: job.question,
            resolutionCriteria: getResolutionCriteria(job.coin.symbol.toUpperCase(), job.threshold, job.resolutionDate),
            resolutionTime: job.resolutionDate,
            cryptoData: {
              id: job.coin.id,
              symbol: job.coin.symbol,
              current_price: job.coin.current_price,
              price_change_percentage_24h: job.coin.price_change_percentage_24h,
              market_cap: job.coin.market_cap,
              total_volume: job.coin.total_volume,
              high_24h: job.coin.high_24h,
              low_24h: job.coin.low_24h,
              target_price: job.threshold,
            },
          });
          return { job, analysis };
        })
      );

      for (const res of analysisResults) {
        if (res.status === 'fulfilled') {
          const { job, analysis } = res.value;
          const analysisWithSubType = {
            ...analysis,
            subType: job.timeframe.label,
            oracle: {
              version: ORACLE_POLICY_VERSION,
              provider: 'coingecko',
              symbol: job.coin.symbol.toUpperCase(),
              targetPrice: job.threshold,
              comparator: 'gte',
              resolutionTimestamp: Number(job.resolutionTime),
              maxObservationDelaySeconds: 120,
            },
          };
          const symbolUpper = job.coin.symbol.toUpperCase();

          try {
            const hash: Hash = await walletClient.writeContract({
              account,
              chain: arcTestnet,
              address: CONTRACT_ADDRESS,
              abi: ARCSIGNAL_ABI,
              functionName: 'createMarket',
              args: [job.marketId, 'CRYPTO', job.question, JSON.stringify(analysisWithSubType), job.resolutionTime],
            });
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            if (receipt.status !== 'success') {
              throw new Error(`createMarket transaction reverted: ${hash}`);
            }
            const createdEvent = receipt.logs.some((log) => {
              try {
                const decoded = decodeEventLog({ abi: ARCSIGNAL_ABI, data: log.data, topics: log.topics });
                const args = decoded.args as { marketId?: string };
                return decoded.eventName === 'MarketCreated' && args.marketId === job.marketId;
              } catch {
                return false;
              }
            });
            if (!createdEvent) throw new Error(`MarketCreated event missing for ${job.marketId}`);
            created.push(`[CRYPTO] ${job.question} (Tx: ${hash})`);
            await new Promise(r => setTimeout(r, 1200));
          } catch (err) {
            errors.push(`[${symbolUpper}] ${job.timeframe.label}: ${err instanceof Error ? err.message : String(err)}`);
          }
        } else {
          errors.push(`Gemini generation failed: ${res.reason}`);
        }
      }
    }
  } catch (err) {
    errors.push(`[CRYPTO] Price fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // FOOTBALL MARKETS
  try {
    if (process.env.API_FOOTBALL_KEY) {
      const wcFixtures = await fetchUpcomingFixtures([1], 2026).catch(() => []);
      const fixtures = wcFixtures.length >= 3 ? wcFixtures : await fetchUpcomingFixtures().catch(() => []);
      const selected = fixtures.slice(0, 4);

      for (const fixture of selected) {
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

          const hash: Hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi: ARCSIGNAL_ABI,
            functionName: 'createMarket',
            args: [marketId, 'FOOTBALL', question, JSON.stringify(analysis), resolutionTime],
          });

          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          if (receipt.status !== 'success') {
            throw new Error(`createMarket transaction reverted: ${hash}`);
          }
          const createdEvent = receipt.logs.some((log) => {
            try {
              const decoded = decodeEventLog({ abi: ARCSIGNAL_ABI, data: log.data, topics: log.topics });
              const args = decoded.args as { marketId?: string };
              return decoded.eventName === 'MarketCreated' && args.marketId === marketId;
            } catch {
              return false;
            }
          });
          if (!createdEvent) throw new Error(`MarketCreated event missing for ${marketId}`);
          created.push(`[FOOTBALL] ${question}`);
        } catch (err) {
          errors.push(`[FOOTBALL] ${fixture.homeTeam} vs ${fixture.awayTeam}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  } catch (err) {
    errors.push(`[FOOTBALL] Fixtures generation skipped/failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return NextResponse.json({
    created,
    skipped,
    errors,
    summary: `${created.length} created, ${skipped.length} skipped, ${errors.length} failed`,
    totalCombinations,
  });
}
