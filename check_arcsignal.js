const { createPublicClient, http } = require('viem');

const arcTestnet = {
  id: 5042002,
  name: 'ARC Testnet',
  network: 'arc-testnet',
  nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
    public: { http: ['https://rpc.testnet.arc.network'] },
  },
};

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

async function main() {
  try {
    const code = await client.getBytecode({ address: '0x1321B81F0608A7166062d6AcABC2b64646D80bC1' });
    console.log('Bytecode at ArcSignal address length:', code ? code.length : 0);
  } catch (e) {
    console.error('Error fetching bytecode:', e);
  }
}

main();
