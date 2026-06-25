import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet } from '../src/lib/arc';
import { fetchTickerPrices } from '../src/lib/coingecko';
import { fetchUpcomingFixtures } from '../src/lib/apifootball';
import { supabase } from '../src/lib/supabase';

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
    name: 'resolveMarket',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'string' },
      { name: 'outcome', type: 'uint8' }
    ],
    outputs: [],
  },
] as const;

async function resolveMarketOnChain(marketId: string, aiCorrect: boolean, outcomeDescription: string) {
  const sb = supabase.instance;
  if (!sb) throw new Error('Supabase not configured');

  // outcome: 0 = Follow wins (AI correct), 1 = Fade wins (AI incorrect)
  const outcomeCode = aiCorrect ? 0 : 1;

  try {
    const { request } = await publicClient.simulateContract({
      account,
      address: ARCSIGNAL_ADDRESS,
      abi: ARCSIGNAL_ABI,
      functionName: 'resolveMarket',
      args: [marketId, outcomeCode],
    });
    
    console.log(`Executing resolveMarket tx for ${marketId}...`);
    const hash = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Successfully resolved market ${marketId} on-chain! Tx: ${hash}`);

    // Update Supabase index to reflect on-chain resolution
    const finalOutcome = `AI was ${aiCorrect ? 'Correct' : 'Incorrect'}. ${outcomeDescription}`;
    
    await sb.from('markets').update({
      resolved: true,
      outcome: finalOutcome,
      resolution_timestamp: Date.now(),
    }).eq('id', marketId);

    // Record the resolution transaction hash for auditability
    await sb.from('resolutions').insert({
      marketId,
      outcome: finalOutcome,
      resolverTxHash: hash
    });

    console.log(`Synced resolution to Supabase for ${marketId}.`);
  } catch (error) {
    console.error(`Failed to resolve market ${marketId} on-chain:`, error);
  }
}

async function runResolution() {
  const sb = supabase.instance;
  if (!sb) {
    console.error('Supabase not configured');
    process.exit(1);
  }

  console.log('Fetching unresolved markets ready for resolution...');
  const { data: markets, error } = await sb
    .from('markets')
    .select('*')
    .eq('resolved', false)
    .lt('resolutionTime', Date.now()); // only fetch past resolutionTime

  if (error) {
    console.error('Failed to fetch markets:', error);
    process.exit(1);
  }

  if (!markets || markets.length === 0) {
    console.log('No markets ready for resolution.');
    return;
  }

  console.log(`Found ${markets.length} markets to resolve.`);

  // Load crypto prices once if needed
  const needsCrypto = markets.some(m => m.category === 'crypto');
  let prices: any[] = [];
  if (needsCrypto) {
    prices = await fetchTickerPrices();
  }

  for (const market of markets) {
    console.log(`\nResolving Market: ${market.id} (${market.title})`);

    try {
      if (market.category === 'crypto') {
        const symbolStr = market.title.split(' ')[0]; // Basic heuristic based on seed script
        const currentPriceData = prices.find(p => p.symbol === symbolStr) || prices.find(p => p.id === symbolStr.toLowerCase());
        
        if (!currentPriceData) {
          console.warn(`Could not find current price for ${symbolStr}. Skipping.`);
          continue;
        }

        // Extremely simplified resolution logic: 
        // If agentPick contains "Bullish", check if price went up. 
        // In a real production system, this would compare against a stored strike price.
        // Assuming AI was always predicting 'UP' for Bullish:
        const isBullishPick = market.agentPick.toLowerCase().includes('bullish');
        const priceWentUp = currentPriceData.change > 0;
        
        const aiCorrect = (isBullishPick && priceWentUp) || (!isBullishPick && !priceWentUp);
        const outcomeDesc = `Final price is $${currentPriceData.price} (${currentPriceData.change}% change).`;

        await resolveMarketOnChain(market.id, aiCorrect, outcomeDesc);
        
      } else if (market.category === 'football') {
        // Football resolution
        const fixtures = await fetchUpcomingFixtures();
        // Look for the match by teams
        const match = fixtures.find(f => f.homeTeam === market.homeTeam && f.awayTeam === market.awayTeam);
        
        if (!match) {
          console.warn(`Could not find match data for ${market.homeTeam} vs ${market.awayTeam}. Skipping.`);
          continue;
        }

        // Check if match is actually finished
        if (match.status !== 'FT' && match.status !== 'AET' && match.status !== 'PEN') {
          console.log(`Match ${market.homeTeam} vs ${market.awayTeam} is not finished yet (Status: ${match.status}). Skipping.`);
          continue;
        }

        // Logic: 1 = Home, 2 = Away, X = Draw
        let actualResult = 'X';
        if (match.homeScore > match.awayScore) actualResult = '1';
        else if (match.awayScore > match.homeScore) actualResult = '2';

        const aiPick = market.agentPick; // expecting '1', '2', or 'X'
        const aiCorrect = (aiPick === actualResult);
        const outcomeDesc = `Final score: ${match.homeScore} - ${match.awayScore}.`;

        await resolveMarketOnChain(market.id, aiCorrect, outcomeDesc);
      }
    } catch (err) {
      console.error(`Error resolving market ${market.id}:`, err);
    }
  }
}

runResolution()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
