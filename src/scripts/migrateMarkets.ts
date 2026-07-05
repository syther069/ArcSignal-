import { createPublicClient, createWalletClient, http, Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet, ARCSIGNAL_ABI } from '../lib/contracts';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const OLD_CONTRACT = '0x1321B81F0608A7166062d6AcABC2b64646D80bC1' as Address;
const NEW_CONTRACT = '0x4f33115a18fe6a181be98610ddde3fab71efabed' as Address;

const RPC_URL = process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ?? 'https://rpc.testnet.arc.network';
const privateKey = process.env.RESOLVER_PRIVATE_KEY;

if (!privateKey) {
  console.error("Missing RESOLVER_PRIVATE_KEY");
  process.exit(1);
}

const account = privateKeyToAccount(privateKey as `0x${string}`);
const publicClient = createPublicClient({ chain: arcTestnet, transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http(RPC_URL) });

async function main() {
  console.log(`Starting migration from ${OLD_CONTRACT} to ${NEW_CONTRACT}...`);

  const count = await publicClient.readContract({
    address: OLD_CONTRACT,
    abi: ARCSIGNAL_ABI,
    functionName: 'getMarketCount',
  }) as bigint;

  console.log(`Found ${count} markets on old contract.`);

  for (let i = 0; i < Number(count); i++) {
    const marketId = await publicClient.readContract({
      address: OLD_CONTRACT,
      abi: ARCSIGNAL_ABI,
      functionName: 'getMarketIdByIndex',
      args: [BigInt(i)],
    }) as string;

    const market = await publicClient.readContract({
      address: OLD_CONTRACT,
      abi: ARCSIGNAL_ABI,
      functionName: 'getMarket',
      args: [marketId],
    }) as any;

    console.log(`Processing ${market.marketId}...`);

    // Check if it already exists on new contract
    try {
      const newMarket = await publicClient.readContract({
        address: NEW_CONTRACT,
        abi: ARCSIGNAL_ABI,
        functionName: 'getMarket',
        args: [market.marketId],
      }) as any;

      if (newMarket && newMarket.marketId === market.marketId) {
        console.log(`  -> Skipping, already exists on new contract.`);
        continue;
      }
    } catch (e) {
      // Doesn't exist, proceed to create
    }

    try {
      console.log(`  -> Creating market on new contract...`);
      const hash = await walletClient.writeContract({
        address: NEW_CONTRACT,
        abi: ARCSIGNAL_ABI,
        functionName: 'createMarket',
        args: [
          market.marketId,
          market.category,
          market.question,
          market.analysisJson,
          market.resolutionTime,
        ],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`  -> Created! Tx: ${hash}`);
    } catch (e: any) {
      console.error(`  -> Failed to create:`, e.shortMessage || e.message);
    }
  }

  console.log("Migration complete!");
}

main().catch(console.error);
