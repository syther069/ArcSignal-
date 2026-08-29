const fs = require('node:fs');
const path = require('node:path');
const { createPublicClient, createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

const ROOT = path.resolve(__dirname, '../../..');
const RPC_URL = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network';
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
const artifactPath = [
  'out/contracts/ArcSignal.sol/ARCSignal.json',
  'out/ArcSignal.sol/ARCSignal.json',
  'out/ARCSignal.sol/ARCSignal.json',
]
  .map((candidate) => path.join(ROOT, candidate))
  .find((candidate) => fs.existsSync(candidate));
if (!artifactPath) {
  throw new Error('ArcSignal Foundry artifact not found. Run `forge build` first.');
}
const artifact = require(artifactPath);
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

async function main() {
  const account = privateKeyToAccount(getDeployerPrivateKey());
  const publicClient = createPublicClient({ chain: arcTestnet, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http(RPC_URL) });
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode.object,
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