import { createPublicClient, http } from 'viem';
import { arcTestnet, ARCSIGNAL_ABI } from '../src/lib/contracts';

const ARCSIGNAL_ADDRESS = '0x4f33115a18fe6a181be98610ddde3fab71efabed';

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http('https://rpc.testnet.arc.network'),
});

async function main() {
  try {
    const ids = await publicClient.readContract({
      address: ARCSIGNAL_ADDRESS as `0x${string}`,
      abi: ARCSIGNAL_ABI,
      functionName: 'getAllMarketIds',
    }) as string[];
    console.log(`getAllMarketIds returned ${ids.length} ids`);
    console.log(`Last 10 ids: ${ids.slice(-10).join(', ')}`);
  } catch (error) {
    console.error("getAllMarketIds failed:", error);
  }
}

main();
