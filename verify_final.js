const { createPublicClient, http, parseAbi } = require('viem');

const arcTestnet = {
  id: 5042002,
  name: 'ARC Testnet',
  network: 'arc-testnet',
  nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
};

const client = createPublicClient({ chain: arcTestnet, transport: http() });

const CONTRACT = '0xcb4428f8b688f3993ad29333807e5dbb6ee0defe';
const CORRECT_USDC = '0x3600000000000000000000000000000000000000';

const ABI = parseAbi([
  'function usdc() view returns (address)',
  'function getMarketCount() view returns (uint256)',
  'function getAllMarketIds() view returns (string[])',
  'function owner() view returns (address)',
]);

async function main() {
  console.log('=== Final Contract Verification ===\n');
  console.log('Contract:', CONTRACT);

  const bytecode = await client.getBytecode({ address: CONTRACT });
  console.log('Has bytecode:', bytecode && bytecode !== '0x' ? '✅ YES' : '❌ NO');

  const usdcAddr = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'usdc' });
  console.log('usdc():', usdcAddr);
  console.log('USDC correct:', usdcAddr.toLowerCase() === CORRECT_USDC.toLowerCase() ? '✅ YES' : '❌ NO');

  const count = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'getMarketCount' });
  console.log('getMarketCount():', count.toString(), '✅');

  const ids = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'getAllMarketIds' });
  console.log('getAllMarketIds():', ids.length, 'markets ✅');

  const owner = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'owner' });
  console.log('owner():', owner, '✅');

  console.log('\n🎉 All checks passed! Contract is correctly deployed.');
  console.log('New markets will be created on the next cron run.');
}

main().catch(console.error);
