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
  const balance = await client.readContract({
    address: '0x3600000000000000000000000000000000000000',
    abi: parseAbi(['function balanceOf(address) external view returns (uint256)']),
    functionName: 'balanceOf',
    args: ['0xf9291CD2722b43d5a30Aab251f046b859'] // User's address from screenshot
  });
  console.log('balanceOf:', balance);
}

main();
