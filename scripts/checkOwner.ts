import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet } from '../src/lib/arc';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const ARCSIGNAL_ADDRESS = process.env.ARCSIGNAL_ADDRESS as `0x${string}`;
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

async function checkOwner() {
  const account = privateKeyToAccount(PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`);
  console.log('Admin wallet address derived from PRIVATE_KEY:', account.address);

  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(),
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
    
    if (account.address.toLowerCase() === (owner as string).toLowerCase()) {
      console.log('✅ Addresses MATCH! The revert is NOT caused by ownership.');
    } else {
      console.log('❌ Addresses DO NOT match! Ownership issue confirmed.');
    }
  } catch (error) {
    console.error('Failed to fetch contract owner:', error);
  }
}

checkOwner().catch(console.error);
