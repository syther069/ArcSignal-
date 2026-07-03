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
  for (let i = 0; i < 10; i++) {
    const slot = await client.getStorageAt({
      address: '0x1321B81F0608A7166062d6AcABC2b64646D80bC1',
      slot: '0x' + i.toString(16)
    });
    console.log(`Slot ${i}:`, slot);
  }
}

main();
