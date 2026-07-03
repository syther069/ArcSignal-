const { createPublicClient, http, parseAbi } = require('viem');

const arcTestnet = {
  id: 5042002,
  name: 'ARC Testnet',
  network: 'arc-testnet',
  nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
};

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

async function main() {
  const decimals = await client.readContract({
    address: '0x3600000000000000000000000000000000000000',
    abi: parseAbi(['function decimals() external view returns (uint8)']),
    functionName: 'decimals'
  });
  console.log('Decimals:', decimals);
}

main();
