const { createPublicClient, http, parseAbiItem } = require('viem');

const arcTestnet = {
  id: 5042002,
  name: 'ARC Testnet',
  network: 'arc-testnet',
  nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
};

const client = createPublicClient({ chain: arcTestnet, transport: http() });
const ARCSIGNAL_ADDRESS = '0xcb4428f8b688f3993ad29333807e5dbb6ee0defe';

async function main() {
  const currentBlock = await client.getBlockNumber();
  const fromBlock = currentBlock - 9000n > 0n ? currentBlock - 9000n : 0n;

  console.log(`Fetching logs from block ${fromBlock} to ${currentBlock}`);
  
  const logs = await client.getLogs({
    address: ARCSIGNAL_ADDRESS,
    event: parseAbiItem('event Staked(string marketId, address user, uint8 side, uint256 amount)'),
    fromBlock,
    toBlock: 'latest'
  });
  console.log(`Found ${logs.length} Staked logs.`);
  if (logs.length > 0) {
    console.log(logs.map(l => l.args));
  }
}

main().catch(console.error);
