const fs = require('node:fs');
const path = require('node:path');
const solc = require('solc');
const { createPublicClient, createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

const ROOT = path.resolve(__dirname, '../../..');
const RPC_URL = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network';
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
const arcTestnet = {
  id: 5042002,
  name: 'ARC Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
};

function getDeployerPrivateKey() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey || !/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    throw new Error('DEPLOYER_PRIVATE_KEY must be configured as a 32-byte hex secret');
  }
  return privateKey;
}

function findImport(importPath) {
  const relativePath = importPath.replace('@openzeppelin/', '');
  const resolved = path.join(ROOT, 'lib/openzeppelin-contracts', relativePath);
  try {
    return { contents: fs.readFileSync(resolved, 'utf8') };
  } catch {
    return { error: `File not found: ${resolved}` };
  }
}

async function main() {
  const sourcePath = path.join(ROOT, 'src/contracts/ArcSignal.sol');
  const contractSource = fs.readFileSync(sourcePath, 'utf8');
  const input = {
    language: 'Solidity',
    sources: { 'ArcSignal.sol': { content: contractSource } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImport }));
  const errors = (output.errors || []).filter((entry) => entry.severity === 'error');
  if (errors.length > 0) {
    errors.forEach((entry) => console.error(entry.formattedMessage));
    throw new Error('Contract compilation failed');
  }

  const compiled = output.contracts?.['ArcSignal.sol']?.ARCSignal;
  if (!compiled) throw new Error('ARCSignal contract was not found in compiler output');

  const artifact = {
    abi: compiled.abi,
    bytecode: `0x${compiled.evm.bytecode.object}`,
  };
  const outputPath = path.join(ROOT, 'out/ArcSignal_compiled.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2));

  const account = privateKeyToAccount(getDeployerPrivateKey());
  const publicClient = createPublicClient({ chain: arcTestnet, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http(RPC_URL) });
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [USDC_ADDRESS],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success' || !receipt.contractAddress) {
    throw new Error(`Deployment failed: ${hash}`);
  }
  console.log(`Contract address: ${receipt.contractAddress}`);
  console.log(`Transaction: ${hash}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});