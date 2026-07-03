const { createPublicClient, http, parseAbi } = require('viem');

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
    const code = await client.getBytecode({ address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' });
    console.log('Bytecode at USDC address:', code);
  } catch (e) {
    console.error('Error fetching bytecode:', e);
  }
}

main();
