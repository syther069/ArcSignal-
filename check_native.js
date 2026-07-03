const { createPublicClient, http } = require('viem');

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
  // Try a random active address to see its native balance vs 0x36 balance
  const addr = '0x1321B81F0608A7166062d6AcABC2b64646D80bC1'; // ArcSignal contract
  const balance = await client.getBalance({ address: addr });
  console.log('Native balance:', balance);
}

main();
