import { createPublicClient, http } from 'viem';
import { arcTestnet, ARCSIGNAL_ABI } from '../src/lib/contracts';

const ARCSIGNAL_ADDRESS = '0x4f33115a18fe6a181be98610ddde3fab71efabed';

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http('https://rpc.testnet.arc.network'),
});

async function main() {
  try {
    const ids = ["BTC-PRICE-5m-1784280390", "ETH-PRICE-5m-1784280390"];
    const results = await publicClient.multicall({
      contracts: ids.map(id => ({
        address: ARCSIGNAL_ADDRESS as `0x${string}`,
        abi: ARCSIGNAL_ABI,
        functionName: 'getMarket',
        args: [id]
      }))
    });
    console.log("Multicall success!", results.length);
  } catch (error) {
    console.error("Multicall failed:", error);
  }
}

main();
