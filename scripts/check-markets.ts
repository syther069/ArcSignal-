import { createPublicClient, http } from 'viem';
import { arcTestnet, ARCSIGNAL_ABI } from '../src/lib/contracts';

const ARCSIGNAL_ADDRESS = '0x4f33115a18fe6a181be98610ddde3fab71efabed';

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http('https://rpc.testnet.arc.network'),
});

async function main() {
  try {
    const count = await publicClient.readContract({
      address: ARCSIGNAL_ADDRESS as `0x${string}`,
      abi: ARCSIGNAL_ABI,
      functionName: 'getMarketCount',
    });
    console.log(`Market count on contract ${ARCSIGNAL_ADDRESS}: ${count}`);
    
    // Check .env address
    const envAddr = "0x1321B81F0608A7166062d6AcABC2b64646D80bC1";
    const count2 = await publicClient.readContract({
      address: envAddr as `0x${string}`,
      abi: ARCSIGNAL_ABI,
      functionName: 'getMarketCount',
    });
    console.log(`Market count on contract ${envAddr}: ${count2}`);
  } catch (error) {
    console.error(error);
  }
}

main();
