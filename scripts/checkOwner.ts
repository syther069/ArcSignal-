import { createPublicClient, http } from 'viem';
import { arcTestnet } from '../src/lib/arc';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const RPC_URL = process.env.ARC_RPC_URL
  ?? process.env.ARC_TESTNET_RPC_URL
  ?? process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL
  ?? 'https://rpc.testnet.arc.network';
const ARCSIGNAL_ADDRESS = (
  process.env.ARCSIGNAL_ADDRESS
  ?? '0x4f33115a18fe6a181be98610ddde3fab71efabed'
) as `0x${string}`;

async function checkOwner() {
  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(RPC_URL),
  });

  try {
    const owner = await publicClient.readContract({
      address: ARCSIGNAL_ADDRESS,
      abi: [{
        type: 'function',
        name: 'owner',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'address' }]
      }],
      functionName: 'owner',
    });
    console.log('Contract owner address from blockchain:', owner);
  } catch (error) {
    console.error('Failed to fetch contract owner:', error);
  }
}

checkOwner().catch(console.error);
