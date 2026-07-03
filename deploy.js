const { createWalletClient, createPublicClient, http, encodeDeployData } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const path = require('path');

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

// Load compiled contract from Foundry output
const artifact = require('./out/ARCSignal.sol/ARCSignal.json');

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
const PRIVATE_KEY = '0xdc36300fd2f94d3fbfcbc751a8f87f8a64d76c0cca634858ab8fb7ea876b3d29';

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  
  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(),
  });

  const walletClient = createWalletClient({
    chain: arcTestnet,
    transport: http(),
    account,
  });

  console.log('Deploying from account:', account.address);
  console.log('USDC address being baked in:', USDC_ADDRESS);
  console.log('');

  // Check deployer balance first
  const balance = await publicClient.getBalance({ address: account.address });
  console.log('Deployer native balance:', balance.toString());

  if (balance === 0n) {
    console.error('ERROR: Deployer has no native balance for gas. Please fund the wallet first.');
    process.exit(1);
  }

  // Encode deployment data: bytecode + constructor args
  const deployData = encodeDeployData({
    abi: artifact.abi,
    bytecode: artifact.bytecode.object,
    args: [USDC_ADDRESS],
  });

  console.log('Sending deployment transaction...');
  
  try {
    const hash = await walletClient.deployContract({
      abi: artifact.abi,
      bytecode: artifact.bytecode.object,
      args: [USDC_ADDRESS],
      account,
    });

    console.log('Tx hash:', hash);
    console.log('Waiting for confirmation...');

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'reverted') {
      console.error('Deployment transaction reverted!');
      process.exit(1);
    }

    console.log('');
    console.log('✅ CONTRACT DEPLOYED SUCCESSFULLY!');
    console.log('New contract address:', receipt.contractAddress);
    console.log('');
    console.log('Now update your .env.local:');
    console.log(`NEXT_PUBLIC_ARCSIGNAL_CONTRACT_ADDRESS="${receipt.contractAddress}"`);
    console.log('');
    console.log('And your .env:');
    console.log(`NEXT_PUBLIC_ARCSIGNAL_CONTRACT_ADDRESS="${receipt.contractAddress}"`);
  } catch (err) {
    console.error('Deployment failed:', err.shortMessage || err.message);
    if (err.cause) {
      console.error('Cause:', err.cause.shortMessage || err.cause.message);
    }
    process.exit(1);
  }
}

main();
