import { NextResponse } from 'next/server';
import { fetchCryptoMarkets } from '@/lib/coingecko';
import { fetchUpcomingFixtures } from '@/lib/apifootball';
import { generateCryptoAnalysis, generateFootballAnalysis } from '@/lib/gemini';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet, ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS, publicClient } from '@/lib/contracts';

export const maxDuration = 300; // Allow enough time for LLM calls and on-chain txs

async function generateAndPublishMarkets() {
  const cryptoData = await fetchCryptoMarkets();
  
  // Fetch World Cup 2026 fixtures first (League ID 1)
  let footballFixtures = await fetchUpcomingFixtures([1], 2026);
  if (footballFixtures.length === 0) {
    // Fallback to top leagues
    footballFixtures = await fetchUpcomingFixtures();
  }
  
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error('PRIVATE_KEY is missing');
  
  const account = privateKeyToAccount(privateKey.startsWith('0x') ? (privateKey as `0x${string}`) : `0x${privateKey}`);
  const rpcUrl = process.env.ARC_TESTNET_RPC_URL || process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.network';
  
  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(rpcUrl),
  });

  const marketsToCreate = [];
  
  // 1. Build Crypto Markets
  const topCoins = cryptoData.slice(0, 6);
  for (const coin of topCoins) {
    const isBullish = Math.random() > 0.5;
    const targetMultiplier = isBullish ? 1.05 : 0.95;
    const direction = isBullish ? 'reach' : 'drop to';
    const targetPrice = coin.current_price * targetMultiplier;
    
    const question = `Will ${coin.symbol.toUpperCase()} ${direction} $${targetPrice.toFixed(2)} in the next 24 hours?`;
    const resolutionTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
    
    const analysis = await generateCryptoAnalysis({
      question,
      resolutionCriteria: `Check if price reaches target using CoinGecko API`,
      resolutionTime: new Date(resolutionTime * 1000).toISOString(),
      cryptoData: coin as any,
    });
    
    marketsToCreate.push({
      question,
      category: 'Crypto',
      subType: coin.symbol.toUpperCase(),
      resolutionTime: BigInt(resolutionTime),
      analysisJson: JSON.stringify(analysis)
    });
  }

  // 2. Build Football Markets
  const matches = footballFixtures.slice(0, 6);
  for (const match of matches) {
    const question = `Will ${match.homeTeam} win against ${match.awayTeam}?`;
    const resolutionTime = match.kickoffTime + 4 * 60 * 60;
    
    const analysis = await generateFootballAnalysis({
      question,
      resolutionCriteria: `Check match result on API-Football`,
      matchTime: new Date(match.kickoffTime * 1000).toISOString(),
      fixtureData: match as any,
    });
    
    marketsToCreate.push({
      question,
      category: 'Sports',
      subType: 'Football',
      resolutionTime: BigInt(resolutionTime),
      analysisJson: JSON.stringify(analysis)
    });
  }

  // 3. Write all 12 markets on-chain
  const results = [];
  for (const market of marketsToCreate) {
    try {
      const { request } = await publicClient.simulateContract({
        address: ARCSIGNAL_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'createMarket',
        args: [
          market.question,
          market.category,
          market.subType,
          market.resolutionTime,
          market.analysisJson
        ],
        account,
      });
      const hash = await walletClient.writeContract(request);
      
      // Wait for it to be mined so nonce doesn't collide easily
      await publicClient.waitForTransactionReceipt({ hash });
      
      results.push({ question: market.question, txHash: hash });
    } catch (e: any) {
      console.error(`Error creating market "${market.question}":`, e);
      results.push({ question: market.question, error: e.message });
    }
  }
  return results;
}

export async function GET() {
  try {
    const results = await generateAndPublishMarkets();
    return NextResponse.json({ success: true, count: results.length, results });
  } catch (error: any) {
    console.error('Cron GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const results = await generateAndPublishMarkets();
    return NextResponse.json({ success: true, count: results.length, results });
  } catch (error: any) {
    console.error('Cron POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
