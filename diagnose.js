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

const ARCSIGNAL = '0x1321B81F0608A7166062d6AcABC2b64646D80bC1';
const USDC = '0x3600000000000000000000000000000000000000';

const ARCSIGNAL_ABI = parseAbi([
  'function getMarketCount() external view returns (uint256)',
  'function getAllMarketIds() external view returns (string[])',
  'function getMarketIdByIndex(uint256 index) external view returns (string)',
  'function getMarket(string marketId) external view returns ((string marketId, string category, string question, string analysisJson, uint256 resolutionTime, uint256 followPool, uint256 fadePool, bool resolved, uint8 outcome))',
]);

const USDC_ABI = parseAbi([
  'function balanceOf(address) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
]);

async function main() {
  console.log('=== FULL DIAGNOSTIC ===\n');

  // 1. Check ArcSignal bytecode
  console.log('--- 1. ArcSignal Contract ---');
  const arcCode = await client.getBytecode({ address: ARCSIGNAL });
  console.log('  Address:', ARCSIGNAL);
  console.log('  Has bytecode:', arcCode && arcCode !== '0x' ? `YES (${arcCode.length} chars)` : 'NO - CONTRACT NOT DEPLOYED');
  
  if (!arcCode || arcCode === '0x') {
    console.log('  ❌ FATAL: No contract at this address! It was never deployed or was self-destructed.');
  } else {
    // Try to call getMarketCount
    try {
      const count = await client.readContract({
        address: ARCSIGNAL,
        abi: ARCSIGNAL_ABI,
        functionName: 'getMarketCount',
      });
      console.log('  getMarketCount():', count.toString());
    } catch (e) {
      console.log('  ❌ getMarketCount() FAILED:', e.shortMessage || e.message);
    }

    // Try getAllMarketIds
    try {
      const ids = await client.readContract({
        address: ARCSIGNAL,
        abi: ARCSIGNAL_ABI,
        functionName: 'getAllMarketIds',
      });
      console.log('  getAllMarketIds():', ids.length, 'markets');
      if (ids.length > 0) {
        console.log('  First 3 IDs:', ids.slice(0, 3));
      }
    } catch (e) {
      console.log('  ❌ getAllMarketIds() FAILED:', e.shortMessage || e.message);
    }
  }

  // 2. Check USDC at 0x3600...
  console.log('\n--- 2. USDC Contract (0x3600...) ---');
  const usdcCode = await client.getBytecode({ address: USDC });
  console.log('  Address:', USDC);
  console.log('  Has bytecode:', usdcCode && usdcCode !== '0x' ? `YES (${usdcCode.length} chars)` : 'NO');

  try {
    const name = await client.readContract({ address: USDC, abi: USDC_ABI, functionName: 'name' });
    const symbol = await client.readContract({ address: USDC, abi: USDC_ABI, functionName: 'symbol' });
    const decimals = await client.readContract({ address: USDC, abi: USDC_ABI, functionName: 'decimals' });
    console.log('  name():', name);
    console.log('  symbol():', symbol);
    console.log('  decimals():', decimals);
  } catch (e) {
    console.log('  ❌ USDC basic calls FAILED:', e.shortMessage || e.message);
  }

  // 3. Check old USDC at Sepolia address
  console.log('\n--- 3. Old USDC (Sepolia addr on Arc) ---');
  const oldUsdc = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
  const oldCode = await client.getBytecode({ address: oldUsdc });
  console.log('  Address:', oldUsdc);
  console.log('  Has bytecode:', oldCode && oldCode !== '0x' ? `YES` : 'NO - NOT A CONTRACT ON ARC');

  // 4. Check the OTHER ArcSignal address from .env
  console.log('\n--- 4. Other ArcSignal addr (from .env) ---');
  const altAddr = '0x1F6c7f1a6D3d4aF9D62E823Ba8fF3A29AA676C2E';
  const altCode = await client.getBytecode({ address: altAddr });
  console.log('  Address:', altAddr);
  console.log('  Has bytecode:', altCode && altCode !== '0x' ? `YES (${altCode.length} chars)` : 'NO');
  
  if (altCode && altCode !== '0x') {
    try {
      const count = await client.readContract({
        address: altAddr,
        abi: ARCSIGNAL_ABI,
        functionName: 'getMarketCount',
      });
      console.log('  getMarketCount():', count.toString());
    } catch (e) {
      console.log('  ❌ getMarketCount() FAILED:', e.shortMessage || e.message);
    }
  }

  // 5. Check if ArcSignal contract accepts the USDC address
  console.log('\n--- 5. ArcSignal ↔ USDC interaction ---');
  console.log('  The ArcSignal.stake() function calls USDC.transferFrom()');
  console.log('  This requires:');
  console.log('    a) ArcSignal contract was deployed with the CORRECT USDC address');
  console.log('    b) User approved the ArcSignal contract to spend their USDC');
  console.log('    c) User has enough USDC balance');

  // Try to read the USDC address the ArcSignal contract was deployed with
  // Common pattern: public variable `usdcToken` or `paymentToken`
  const possibleGetters = [
    'function usdcToken() view returns (address)',
    'function usdc() view returns (address)',
    'function paymentToken() view returns (address)',
    'function token() view returns (address)',
    'function stakeToken() view returns (address)',
  ];
  
  for (const sig of possibleGetters) {
    try {
      const abi = parseAbi([sig]);
      const fnName = sig.match(/function (\w+)/)[1];
      const result = await client.readContract({
        address: ARCSIGNAL,
        abi,
        functionName: fnName,
      });
      console.log(`  ArcSignal.${fnName}() =`, result);
    } catch (e) {
      // silently skip
    }
  }

  console.log('\n=== DIAGNOSTIC COMPLETE ===');
}

main().catch(console.error);
