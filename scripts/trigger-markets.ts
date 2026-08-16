import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { createWalletClient, http, createPublicClient, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet, ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '../src/lib/contracts';
import { fetchCryptoMarkets } from '../src/lib/coingecko';
import { generateCryptoAnalysis } from '../src/lib/gemini';

const RPC_URL = process.env.ARC_RPC_URL ?? process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ?? 'https://rpc.testnet.arc.network';
const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_ARCSIGNAL_CONTRACT_ADDRESS || ARCSIGNAL_ADDRESS) as Address;

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(RPC_URL, {
    retryCount: 3,
    retryDelay: 600,
  }),
});

const REQUIRED_SYMBOLS = ['BTC', 'ETH', 'SOL', 'XRP', 'SUI', 'AVAX'];
const TIMEFRAMES: { label: string; minutes: number }[] = [
  { label: '5m',  minutes: 5 },
  { label: '15m', minutes: 15 },
  { label: '1h',  minutes: 60 },
  { label: '4h',  minutes: 240 },
  { label: '24h', minutes: 1440 },
];

const TIMEFRAME_SECONDS: Record<string, number> = {
  '5m':  300,
  '15m': 900,
  '1h':  3600,
  '4h':  14400,
  '24h': 86400,
};

function parseMarketId(marketId: string) {
  // Format: SYMBOL-PRICE-TIMEFRAME-TIMESTAMP
  const parts = marketId.split('-');
  if (parts.length < 4) return null;
  
  const symbol = parts[0].toUpperCase();
  const category = parts[1].toUpperCase();
  const timeframe = parts[2];
  const genTime = parseInt(parts[3], 10);
  if (isNaN(genTime)) return null;

  const durationSec = TIMEFRAME_SECONDS[timeframe] ?? 3600;
  const resolutionTime = genTime + durationSec;

  return { marketId, symbol, category, timeframe, genTime, resolutionTime };
}

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
  return `Will ${symbol} close above $${fmt(target)} on today's daily candle?`;
}

function getResolutionCriteria(symbol: string, current: number, target: number, timeframe: string, resolutionDate: string): string {
  const fmt = (n: number) => n.toLocaleString('en-US');
  if (timeframe === '5m') return `Resolves YES if ${symbol}/USD price on CoinGecko is at or above $${fmt(getSupportLevel(current))} at resolution time (${resolutionDate}). Resolves NO if price drops below $${fmt(getSupportLevel(current))}.`;
  if (timeframe === '15m') return `Resolves YES if ${symbol}/USD price on CoinGecko is at or above $${fmt(target)} at resolution time (${resolutionDate}). Current price at generation: $${fmt(current)}.`;
  if (timeframe === '1h') return `Resolves YES if ${symbol}/USD price on CoinGecko is above $${fmt(target)} at resolution time (${resolutionDate}). This represents a ~1% gain from the current price of $${fmt(current)}.`;
  if (timeframe === '4h') return `Resolves YES if ${symbol}/USD price on CoinGecko exceeds $${fmt(target)} at resolution time (${resolutionDate}). This represents approximately a 2% move from the current price of $${fmt(current)}.`;
  return `Resolves YES if ${symbol}/USD daily close price on CoinGecko is above $${fmt(target)} at resolution time (${resolutionDate}). Current price: $${fmt(current)}. Target represents ~3.5% gain.`;
}

async function writeContractWithRetry(
  walletClient: any,
  publicClient: any,
  account: any,
  writeArgs: any,
  currentNonceRef: { nonce: number },
  maxRetries = 4
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      writeArgs.nonce = currentNonceRef.nonce;
      const hash = await walletClient.writeContract(writeArgs);
      await publicClient.waitForTransactionReceipt({ hash });
      currentNonceRef.nonce++;
      return hash;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isRetryable = 
        errMsg.includes('429') || 
        errMsg.includes('request limit reached') || 
        errMsg.includes('limit') ||
        errMsg.includes('nonce too low') ||
        errMsg.includes('lower than the current nonce') ||
        errMsg.includes('nonce too high');
      
      if (isRetryable && attempt < maxRetries) {
        if (errMsg.includes('429') || errMsg.includes('limit')) {
          console.log(`    ⚠️ RPC 429 rate limit hit. Waiting 2.5s before retry (attempt ${attempt}/${maxRetries})...`);
          await new Promise((r) => setTimeout(r, 2500));
        } else {
          console.log(`    ⚠️ Nonce sync adjustment. Retrying (attempt ${attempt}/${maxRetries})...`);
          await new Promise((r) => setTimeout(r, 500));
        }

        try {
          const freshNonce = await publicClient.getTransactionCount({
            address: account.address,
            blockTag: 'pending',
          });
          currentNonceRef.nonce = freshNonce;
        } catch {}
        continue;
      }
      throw err;
    }
  }
  throw new Error('Transaction failed after maximum retries');
}

async function main() {
  console.log('====================================================');
  console.log('⚡ ARCSIGNAL MARKET TRIGGER & RESOLVER');
  console.log('====================================================');

  const privateKey = process.env.RESOLVER_PRIVATE_KEY;
  if (!privateKey || !/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    console.error('❌ FATAL: RESOLVER_PRIVATE_KEY missing or invalid in .env / .env.local');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(RPC_URL),
  });

  const now = Math.floor(Date.now() / 1000);
  console.log(`Resolver account: ${account.address}`);
  console.log(`Contract address: ${CONTRACT_ADDRESS}`);
  console.log(`Current time: ${new Date(now * 1000).toISOString()}\n`);

  // STEP 1: Fast Fetch On-Chain Market IDs
  console.log('🔍 Querying market IDs from contract...');
  const allIds = (await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'getAllMarketIds',
  })) as string[];

  console.log(`Total market IDs on chain: ${allIds.length}`);

  const parsedMarkets = allIds.map(parseMarketId).filter((m): m is NonNullable<typeof m> => Boolean(m));
  
  // Find active non-expired markets
  const activeParsed = parsedMarkets.filter(m => m.resolutionTime > now);
  
  // Find candidates for resolution (expired and active)
  const expiredCandidateIds = parsedMarkets.filter(m => m.resolutionTime <= now).map(m => m.marketId);
  const activeCandidateIds = activeParsed.map(m => m.marketId);

  // STEP 2: Resolve Expired or Early Markets
  console.log(`\n⚖️ Checking ${expiredCandidateIds.length} expired and ${activeCandidateIds.length} active markets for resolution...`);
  
  // Inspect the most recent expired markets and all active markets
  const recentExpiredIds = expiredCandidateIds.slice(-30);
  const candidatesToCheck = [...recentExpiredIds, ...activeCandidateIds];
  const expiredToResolve: any[] = [];

  for (let i = 0; i < candidatesToCheck.length; i += 10) {
    const chunk = candidatesToCheck.slice(i, i + 10);
    const results = await Promise.allSettled(
      chunk.map(id => publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'getMarket',
        args: [id]
      }))
    );

    for (const res of results) {
      if (res.status === 'fulfilled' && res.value) {
        const m = res.value as any;
        if (!m.resolved) {
          expiredToResolve.push(m);
        }
      }
    }
  }

  const nonceRef = {
    nonce: await publicClient.getTransactionCount({
      address: account.address,
      blockTag: 'pending',
    })
  };

  if (expiredToResolve.length === 0) {
    console.log('  No pending expired markets to resolve.');
  } else {
    console.log(`  Resolving ${expiredToResolve.length} expired markets...`);
    let coins: Awaited<ReturnType<typeof fetchCryptoMarkets>> = [];
    try {
      coins = await fetchCryptoMarkets();
    } catch {
      console.warn('  CoinGecko price fetch warning, using fallback logic.');
    }

    for (const m of expiredToResolve) {
      try {
        let outcome: 1 | 2 = 2; // 1 = Follow, 2 = Fade
        let outcomeReason = 'default';
        const isExpired = Number(m.resolutionTime) <= now;
        let shouldResolveNow = isExpired;

        const categoryNorm = m.category.toUpperCase();
        
        if (categoryNorm === 'CRYPTO') {
          const priceMatch = m.question.match(/\$?([\d,]+(?:\.\d+)?)/);
          if (priceMatch) {
            const targetPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
            const symbolRaw = m.marketId.split('-')[0].toLowerCase();
            const coin = coins.find(
              (c) => c.symbol.toLowerCase() === symbolRaw || c.id.toLowerCase() === symbolRaw
            );
            
            if (coin) {
              const is5m = m.marketId.includes('-5m-');
              
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
          }
        }
        
        if (!shouldResolveNow) {
          continue;
        }

        console.log(`  - Resolving ${m.marketId} -> Outcome ${outcome} (${outcomeReason})`);
        const txHash = await writeContractWithRetry(
          walletClient,
          publicClient,
          account,
          {
            account,
            chain: arcTestnet,
            address: CONTRACT_ADDRESS,
            abi: ARCSIGNAL_ABI,
            functionName: 'resolveMarket',
            args: [m.marketId, outcome],
          },
          nonceRef
        );
        console.log(`    Tx: ${txHash}`);
        await new Promise((r) => setTimeout(r, 1200));
      } catch (err: any) {
        console.error(`  ❌ Failed to resolve ${m.marketId}:`, err.message);
      }
    }
  }

  // STEP 3: Identify Missing Active Markets (Target = 6 per timeframe)
  console.log('\n📊 Assessing active market counts per timeframe...');
  const cryptoMarkets = await fetchCryptoMarkets();
  const marketsBySymbol = new Map(
    cryptoMarkets.map((coin) => [coin.symbol.toUpperCase(), coin])
  );

  const selectedCoins = REQUIRED_SYMBOLS.map((symbol) => marketsBySymbol.get(symbol)).filter(
    (c): c is NonNullable<typeof c> => Boolean(c)
  );

  const missingJobs: { coin: typeof selectedCoins[0]; timeframe: typeof TIMEFRAMES[0] }[] = [];

  for (const tf of TIMEFRAMES) {
    const tfActive = activeParsed.filter((m) => m.timeframe === tf.label);
    console.log(`  Timeframe [${tf.label.padStart(3)}]: ${tfActive.length}/6 active markets`);

    for (const coin of selectedCoins) {
      const symbolUpper = coin.symbol.toUpperCase();
      const hasActive = tfActive.some((m) => m.symbol === symbolUpper);
      if (!hasActive) {
        missingJobs.push({ coin, timeframe: tf });
      }
    }
  }

  if (missingJobs.length === 0) {
    console.log('\n✅ All timeframes already have 6 active markets (30/30 total)!');
    console.log('====================================================\n');
    return;
  }

  console.log(`\n🚀 Generating ${missingJobs.length} missing markets to ensure 6 per timeframe...`);

  let createdCount = 0;
  let errorCount = 0;
  let retryJobs = [...missingJobs];
  let failedJobs: typeof missingJobs = [];

  while (retryJobs.length > 0) {
    for (const job of retryJobs) {
      const { coin, timeframe } = job;
      const symbolUpper = coin.symbol.toUpperCase();
      const target = getPriceTarget(coin.current_price, timeframe.label);
      const resolutionTime = BigInt(now + timeframe.minutes * 60);
      const resolutionDate = new Date(Number(resolutionTime) * 1000).toUTCString();
      const question = getQuestion(symbolUpper, coin.current_price, target, timeframe.label);
      const marketId = `${symbolUpper}-PRICE-${timeframe.label}-${now}`;

      console.log(`  [${symbolUpper} ${timeframe.label}] "${question.slice(0, 50)}..."`);

      try {
        const analysis = await generateCryptoAnalysis({
          question,
          resolutionCriteria: getResolutionCriteria(
            symbolUpper,
            coin.current_price,
            target,
            timeframe.label,
            resolutionDate
          ),
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

        const hash = await writeContractWithRetry(
          walletClient,
          publicClient,
          account,
          {
            account,
            chain: arcTestnet,
            address: CONTRACT_ADDRESS,
            abi: ARCSIGNAL_ABI,
            functionName: 'createMarket',
            args: [
              marketId,
              'CRYPTO',
              question,
              JSON.stringify(analysisWithSubType),
              resolutionTime,
            ],
          },
          nonceRef
        );

        console.log(`  -> Tx: ${hash}`);
        createdCount++;
        await new Promise((r) => setTimeout(r, 1200));
      } catch (err: any) {
        console.log(`  -> ❌ ERROR: ${err.message}`);
        errorCount++;
        failedJobs.push(job);
      }
    }

    if (failedJobs.length > 0) {
      console.log(`\n♻️ Retrying ${failedJobs.length} failed markets...`);
      await new Promise((r) => setTimeout(r, 5000));
      retryJobs = [...failedJobs];
      failedJobs = [];
    } else {
      retryJobs = [];
    }
  }

  // STEP 4: Final Summary
  console.log('\n====================================================');
  console.log('🎉 MARKET GENERATION COMPLETE!');
  console.log(`   - Markets Created: ${createdCount}`);
  console.log(`   - Errors: ${errorCount}`);
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
