const solc = require('solc');
const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

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

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
const PRIVATE_KEY = '0xdc36300fd2f94d3fbfcbc751a8f87f8a64d76c0cca634858ab8fb7ea876b3d29';

// Read the contract source
const contractSource = fs.readFileSync('./src/contracts/ArcSignal.sol', 'utf8');

// Read OpenZeppelin contracts
function findImport(importPath) {
  // Map @openzeppelin to lib/openzeppelin-contracts
  const resolved = importPath.replace('@openzeppelin/', './lib/openzeppelin-contracts/');
  try {
    const content = fs.readFileSync(resolved, 'utf8');
    return { contents: content };
  } catch (e) {
    return { error: `File not found: ${resolved}` };
  }
}

async function main() {
  console.log('=== Compiling ArcSignal.sol ===\n');

  const input = {
    language: 'Solidity',
    sources: {
      'ArcSignal.sol': {
        content: contractSource,
      },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object'],
        },
      },
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImport }));

  // Check for errors
  if (output.errors) {
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
      console.error('Compilation errors:');
      errors.forEach(e => console.error(e.formattedMessage));
      process.exit(1);
    }
    // Show warnings
    const warnings = output.errors.filter(e => e.severity === 'warning');
    if (warnings.length > 0) {
      console.warn('Compilation warnings:');
      warnings.forEach(w => console.warn(w.formattedMessage));
    }
  }

  const contractOutput = output.contracts['ArcSignal.sol']['ARCSignal'];
  if (!contractOutput) {
    console.error('Contract "ARCSignal" not found in output. Available:', Object.keys(output.contracts['ArcSignal.sol'] || {}));
    process.exit(1);
  }

  const abi = contractOutput.abi;
  const bytecode = '0x' + contractOutput.evm.bytecode.object;
  
  console.log('✅ Compiled successfully!');
  console.log('ABI functions:', abi.filter(x => x.type === 'function').map(x => x.name).join(', '));
  console.log('Bytecode length:', bytecode.length, 'chars\n');

  // Save ABI for later use
  fs.writeFileSync('./out/ArcSignal_compiled.json', JSON.stringify({ abi, bytecode }, null, 2));
  console.log('Saved to out/ArcSignal_compiled.json\n');

  // Deploy
  console.log('=== Deploying to Arc Testnet ===\n');
  
  const account = privateKeyToAccount(PRIVATE_KEY);
  const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
  const walletClient = createWalletClient({ chain: arcTestnet, transport: http(), account });

  console.log('Deploying from:', account.address);
  console.log('USDC address baked in:', USDC_ADDRESS);

  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [USDC_ADDRESS],
    account,
  });

  console.log('Tx hash:', hash);
  console.log('Waiting for confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status === 'reverted') {
    console.error('❌ Deployment reverted!');
    process.exit(1);
  }

  console.log('\n✅ NEW CONTRACT DEPLOYED!');
  console.log('Address:', receipt.contractAddress);
  console.log('\nUpdate your .env.local:');
  console.log(`NEXT_PUBLIC_ARCSIGNAL_CONTRACT_ADDRESS="${receipt.contractAddress}"`);
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
