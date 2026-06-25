import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet } from '../src/lib/arc';
import { fetchUpcomingFixtures } from '../src/lib/apifootball';
import { generateCryptoMarket, analyzeFootballMatch } from '../src/lib/gemini';
import { fetchTickerPrices } from '../src/lib/coingecko';
import { supabase, insertMarket } from '../src/lib/supabase';

// Environment variables are loaded via node --env-file=.env flag

const ARCSIGNAL_ADDRESS = process.env.ARCSIGNAL_ADDRESS as `0x${string}`;
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

if (!ARCSIGNAL_ADDRESS || !PRIVATE_KEY) {
  console.error("Missing ARCSIGNAL_ADDRESS or PRIVATE_KEY in .env");
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`);

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

const walletClient = createWalletClient({
  account,
  chain: arcTestnet,
  transport: http(),
});

const ARCSIGNAL_ABI = [
  {
    type: 'function',
    name: 'createMarket',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'string' },
      { name: 'category', type: 'string' },
      { name: 'resolutionTime', type: 'uint256' }
    ],
    outputs: [],
  },
] as const;

async function createMarketOnChain(marketId: string, category: string, resolutionTime: number) {
  try {
    const { request } = await publicClient.simulateContract({
      account,
      address: ARCSIGNAL_ADDRESS,
      abi: ARCSIGNAL_ABI,
      functionName: 'createMarket',
      args: [marketId, category, BigInt(Math.floor(resolutionTime / 1000))],
    });
    const hash = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Successfully created market ${marketId} on-chain! Tx: ${hash}`);
  } catch (error) {
    console.warn(`Failed to create market ${marketId} on-chain. This might be because the ABI expects different arguments or the contract isn't deployed properly. Error:`, error);
  }
}

async function seedFootball() {
  console.log('\n========== SEEDING FOOTBALL MARKETS ==========');
  const fixtures = await fetchUpcomingFixtures();
  console.log(`Found ${fixtures.length} fixtures to process.`);

  for (const fixture of fixtures) {
    console.log(`\n--- Processing: ${fixture.homeTeam} vs ${fixture.awayTeam} ---`);
    
    let analysis;
    try {
      analysis = await analyzeFootballMatch(fixture.homeTeam, fixture.awayTeam);
    } catch (err) {
      console.error(`[seedFootball] Gemini failed for ${fixture.homeTeam} vs ${fixture.awayTeam}:`, err);
      continue;
    }

    // Validate AI output BEFORE building payload
    console.log('[seedFootball] AI fields check:');
    console.log(`  probability: ${analysis.probability}`);
    console.log(`  summary:     ${analysis.summary?.slice(0, 80)}...`);
    console.log(`  bull_case:   ${analysis.bull_case?.slice(0, 60)}...`);
    console.log(`  bear_case:   ${analysis.bear_case?.slice(0, 60)}...`);
    console.log(`  data_sources: ${analysis.data_sources?.join(', ')}`);

    if (!analysis.probability || !analysis.summary || !analysis.bull_case || !analysis.bear_case || !analysis.data_sources) {
      console.error('[seedFootball] ❌ SKIPPING: AI output is missing required fields. Full analysis:');
      console.error(JSON.stringify(analysis, null, 2));
      continue;
    }

    const marketPayload = {
      category: 'football' as const,
      title: analysis.title,
      description: analysis.description,
      agentId: analysis.agentId,
      agentPick: analysis.agentPick,
      confidence: analysis.confidence,
      probability: analysis.probability,
      summary: analysis.summary,
      bull_case: analysis.bull_case,
      bear_case: analysis.bear_case,
      keyFactors: analysis.keyFactors,
      data_sources: analysis.data_sources,
      followPool: 0,
      fadePool: 0,
      volume: 0,
      participants: 0,
      resolutionTime: Date.now() + 24 * 60 * 60 * 1000,
      resolved: false,
      league: fixture.league,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
    };

    try {
      const inserted = await insertMarket(marketPayload);
      console.log(`✅ Inserted football market: ${inserted.id}`);
      await createMarketOnChain(inserted.id, marketPayload.category, marketPayload.resolutionTime);
    } catch (err) {
      console.error('[seedFootball] ❌ Supabase insert failed:', err);
    }
  }
}

async function seedCrypto() {
  console.log('\n========== SEEDING CRYPTO MARKETS ==========');
  const prices = await fetchTickerPrices();
  console.log(`Fetched prices for: ${prices.map(p => p.symbol).join(', ')}`);

  const TARGET_TOKENS = ['BTC', 'ETH', 'SOL'];
  const TIME_HORIZONS: Array<'1h' | '24h' | '30d'> = ['1h', '24h', '30d'];

  const getMsForHorizon = (horizon: string) => {
    switch (horizon) {
      case '1h':  return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default:    return 24 * 60 * 60 * 1000;
    }
  };

  for (const symbol of TARGET_TOKENS) {
    const coin = prices.find(p => p.symbol === symbol);
    if (!coin) {
      console.warn(`[seedCrypto] No price data for ${symbol} — skipping.`);
      continue;
    }
    console.log(`\n[seedCrypto] ${symbol} price=$${coin.price} change=${coin.change}%`);

    for (const horizon of TIME_HORIZONS) {
      console.log(`\n--- ${symbol} / ${horizon} ---`);

      let analysis;
      try {
        analysis = await generateCryptoMarket(symbol, coin.price, coin.change, horizon);
      } catch (err) {
        console.error(`[seedCrypto] Gemini failed for ${symbol}/${horizon}:`, err);
        continue;
      }

      // Validate AI output BEFORE building payload
      console.log('[seedCrypto] AI fields check:');
      console.log(`  probability: ${analysis.probability}`);
      console.log(`  summary:     ${analysis.summary?.slice(0, 80)}...`);
      console.log(`  bull_case:   ${analysis.bull_case?.slice(0, 60)}...`);
      console.log(`  bear_case:   ${analysis.bear_case?.slice(0, 60)}...`);
      console.log(`  data_sources: ${analysis.data_sources?.join(', ')}`);

      if (!analysis.probability || !analysis.summary || !analysis.bull_case || !analysis.bear_case || !analysis.data_sources) {
        console.error(`[seedCrypto] ❌ SKIPPING ${symbol}/${horizon}: missing AI fields. Full analysis:`);
        console.error(JSON.stringify(analysis, null, 2));
        continue;
      }

      const marketPayload = {
        category: 'crypto' as const,
        subType: 'price' as const,
        title: analysis.title,
        description: analysis.description,
        agentId: analysis.agentId,
        agentPick: analysis.agentPick,
        confidence: analysis.confidence,
        probability: analysis.probability,
        summary: analysis.summary,
        bull_case: analysis.bull_case,
        bear_case: analysis.bear_case,
        keyFactors: analysis.keyFactors,
        data_sources: analysis.data_sources,
        followPool: 0,
        fadePool: 0,
        volume: 0,
        participants: 0,
        resolutionTime: Date.now() + getMsForHorizon(horizon),
        resolved: false,
      };

      try {
        const inserted = await insertMarket(marketPayload);
        console.log(`✅ Inserted ${symbol}/${horizon}: ${inserted.id}`);
        await createMarketOnChain(inserted.id, marketPayload.category, marketPayload.resolutionTime);
      } catch (err) {
        console.error(`[seedCrypto] ❌ Supabase insert failed for ${symbol}/${horizon}:`, err);
      }
    }
  }
}

async function main() {
  await seedFootball();
  await seedCrypto();
  console.log('Seeding complete!');
}

main().catch(console.error);
