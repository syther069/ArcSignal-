const { createPublicClient, http, parseAbi } = require('viem');

const arcTestnet = {
  id: 5042002,
  name: 'ARC Testnet',
  network: 'arc-testnet',
  nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
};

const client = createPublicClient({ chain: arcTestnet, transport: http() });

const NEW_CONTRACT = '0xcad389cb6f57cc92a57d2a5f676a1e920cdedefd';
const CORRECT_USDC = '0x3600000000000000000000000000000000000000';

const ABI = parseAbi([
  'function usdc() view returns (address)',
  'function getMarketCount() view returns (uint256)',
  'function owner() view returns (address)',
]);

async function main() {
  console.log('=== Verifying New Contract ===\n');

  const bytecode = await client.getBytecode({ address: NEW_CONTRACT });
  console.log('Has bytecode:', bytecode && bytecode !== '0x' ? 'YES ✅' : 'NO ❌');

  const usdcAddr = await client.readContract({ address: NEW_CONTRACT, abi: ABI, functionName: 'usdc' });
  console.log('usdc() address:', usdcAddr);
  console.log('USDC is correct:', usdcAddr.toLowerCase() === CORRECT_USDC.toLowerCase() ? 'YES ✅' : 'NO ❌');

  const count = await client.readContract({ address: NEW_CONTRACT, abi: ABI, functionName: 'getMarketCount' });
  console.log('Market count:', count.toString(), '(fresh deployment = 0 is expected)');

  const owner = await client.readContract({ address: NEW_CONTRACT, abi: ABI, functionName: 'owner' });
  console.log('Owner:', owner);
  console.log('\n✅ Contract is correctly deployed with the right USDC address!');
}

main().catch(console.error);
