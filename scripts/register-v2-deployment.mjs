import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { keccak256 } from 'viem';
import { neon } from '@neondatabase/serverless';

const MAINNET_CHAIN_ID = 5042;
const MAINNET_USDC = '0x3600000000000000000000000000000000000000';
const addressPattern = /^0x[a-fA-F0-9]{40}$/;
const hashPattern = /^0x[a-fA-F0-9]{64}$/;
const contractKeys = {
  ArcSignalFactoryV2: 'factory',
  ArcSignalMarketDeployerV2: 'marketDeployer',
  PredictionMarketAMMDeployerV2: 'ammDeployer',
  CategoryRegistryV2: 'categoryRegistry',
  OraclePolicyRegistryV2: 'oraclePolicyRegistry',
  ProtocolFeeControllerV2: 'feeController',
  UMAOracleAdapterV2: 'oracleAdapter',
};
const args = new Set(process.argv.slice(2));
const targetChainId = [...args].find((value) => /^\d+$/.test(value))
  ?? process.env.CHAIN_ID ?? process.env.EXPECTED_CHAIN_ID
  ?? (process.env.NEXT_PUBLIC_ARC_NETWORK === 'mainnet' ? '5042' : '5042002');
const chainId = Number(targetChainId);
const isMainnet = chainId === MAINNET_CHAIN_ID;
const shouldRegister = args.has('--register');
const shouldActivate = args.has('--activate');

if (!Number.isSafeInteger(chainId) || chainId <= 0) throw new Error(`Invalid chain ID: ${targetChainId}`);
if (shouldActivate && !shouldRegister) throw new Error('--activate requires --register.');
if (isMainnet && process.env.DEPLOY_TESTNET_ORACLE === 'true') throw new Error('DEPLOY_TESTNET_ORACLE must not be true on mainnet.');

function address(name, value) {
  if (!value || !addressPattern.test(value)) throw new Error(`${name} must be a 20-byte 0x address.`);
  return value.toLowerCase();
}
function hash(name, value) {
  if (!value || !hashPattern.test(value)) throw new Error(`${name} must be a 32-byte 0x hash.`);
  return value.toLowerCase();
}
async function rpc(url, method, params) {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  if (!response.ok) throw new Error(`RPC ${method} failed with HTTP ${response.status}.`);
  const payload = await response.json();
  if (payload.error) throw new Error(`RPC ${method} failed: ${payload.error.message ?? 'unknown error'}.`);
  return payload.result;
}

const broadcastPath = join(process.cwd(), 'broadcast', 'DeployArcSignalV2.s.sol', String(chainId), 'run-latest.json');
const broadcast = JSON.parse(await readFile(broadcastPath, 'utf8'));
const transactions = Array.isArray(broadcast.transactions) ? broadcast.transactions : [];
const receipts = Array.isArray(broadcast.receipts) ? broadcast.receipts : [];
const deployed = {};
let deploymentBlock;
let deploymentTransactionHash;
for (let index = 0; index < transactions.length; index += 1) {
  const transaction = transactions[index];
  const key = contractKeys[transaction?.contractName];
  if (!key || !transaction?.contractAddress) continue;
  deployed[key] = address(transaction.contractName, transaction.contractAddress);
  const receipt = receipts.find((candidate) => candidate?.transactionHash === transaction.hash) ?? receipts[index];
  if (key === 'factory') {
    deploymentTransactionHash = hash('factory deployment transaction hash', receipt?.transactionHash ?? transaction.hash);
    deploymentBlock = BigInt(receipt?.blockNumber).toString();
  }
}
for (const key of Object.values(contractKeys)) if (!deployed[key]) throw new Error(`Broadcast file is missing ${key}.`);
if (!deploymentBlock || !deploymentTransactionHash) throw new Error('Broadcast file is missing factory receipt data.');

const usdc = address('USDC_ADDRESS', process.env.USDC_ADDRESS ?? (isMainnet ? MAINNET_USDC : undefined));
const optimisticOracle = address('OPTIMISTIC_ORACLE_ADDRESS', process.env.OPTIMISTIC_ORACLE_ADDRESS);
if (isMainnet && usdc !== MAINNET_USDC) throw new Error(`USDC_ADDRESS must be ${MAINNET_USDC} on Arc Mainnet.`);
const roles = {
  protocolAdmin: address('PROTOCOL_ADMIN', process.env.PROTOCOL_ADMIN),
  marketCreator: address('MARKET_CREATOR', process.env.MARKET_CREATOR),
  resolutionOperator: address('RESOLUTION_OPERATOR', process.env.RESOLUTION_OPERATOR),
  pauseGuardian: address('PAUSE_GUARDIAN', process.env.PAUSE_GUARDIAN),
  treasury: address('PROTOCOL_TREASURY', process.env.PROTOCOL_TREASURY),
};
const gitCommit = (process.env.GIT_COMMIT ?? '').trim().toLowerCase();
if (!/^[a-f0-9]{40}$/.test(gitCommit)) throw new Error('GIT_COMMIT must be the exact 40-character release commit SHA.');
const limits = {
  maxMarketCollateral: process.env.MAX_MARKET_COLLATERAL,
  maxProtocolCollateral: process.env.MAX_PROTOCOL_COLLATERAL,
  maxInitialLiquidity: process.env.MAX_INITIAL_LIQUIDITY,
};
for (const [name, value] of Object.entries(limits)) {
  if (!value || !/^\d+$/.test(value)) throw new Error(`${name} must be an integer in USDC base units.`);
  limits[name] = BigInt(value).toString();
}
if (
  BigInt(limits.maxMarketCollateral) === 0n
  || BigInt(limits.maxProtocolCollateral) < BigInt(limits.maxMarketCollateral)
  || BigInt(limits.maxInitialLiquidity) > BigInt(limits.maxMarketCollateral)
) throw new Error('Exposure limits are inconsistent: require 0 < market <= protocol and seed <= market.');
const rpcUrl = process.env.ARC_RPC_URL ?? process.env.RPC_URL ?? (isMainnet ? 'https://rpc.mainnet.arc.io' : 'https://rpc.testnet.arc.io');
if (isMainnet && /testnet/i.test(rpcUrl)) throw new Error('Mainnet registration refuses a testnet RPC.');
if (Number(BigInt(await rpc(rpcUrl, 'eth_chainId', []))) !== chainId) throw new Error('RPC chain ID does not match the broadcast target.');

const contracts = { ...deployed, usdc, optimisticOracle };
const bytecodeHashes = {};
for (const [name, contractAddress] of Object.entries(contracts)) {
  const bytecode = await rpc(rpcUrl, 'eth_getCode', [contractAddress, 'latest']);
  if (!bytecode || bytecode === '0x') {
    if (name === 'optimisticOracle') {
      bytecodeHashes[name] = null;
      continue;
    }
    throw new Error(`No deployed bytecode at ${name} (${contractAddress}).`);
  }
  bytecodeHashes[name] = keccak256(bytecode);
}
const manifest = { protocolVersion: 2, chainId, gitCommit, solcVersion: '0.8.35', deploymentBlock, deploymentTransactionHash, contracts, roles, limits, policyVersions: { categories: 1, oraclePolicy: 1, fees: 1 }, bytecodeHashes };
const artifactDir = join(process.cwd(), 'artifacts', 'deployments');
const artifactPath = join(artifactDir, `arc-${chainId}-v2-manifest.json`);
await mkdir(artifactDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Wrote schema-compatible deployment manifest: ${artifactPath}`);
if (!shouldRegister) {
  console.log('Database untouched. Re-run with --register only after independent verification and explicit approval.');
  process.exit(0);
}
if (isMainnet && process.env.ARC_MAINNET_REGISTRATION_APPROVED !== 'true') throw new Error('Set ARC_MAINNET_REGISTRATION_APPROVED=true only after explicit approval to mutate production deployment records.');
const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!databaseUrl) throw new Error('DATABASE_URL or POSTGRES_URL is required with --register.');
const sql = neon(databaseUrl);
await sql.query(
  `insert into protocol_deployments (chain_id, protocol_version, factory_address, deployment_block, deployment_tx_hash, bytecode_manifest, active_for_creation)
   values ($1, $2, $3, $4, $5, $6::jsonb, $7)
   on conflict (chain_id, protocol_version) do update set factory_address = excluded.factory_address, deployment_block = excluded.deployment_block, deployment_tx_hash = excluded.deployment_tx_hash, bytecode_manifest = excluded.bytecode_manifest, active_for_creation = excluded.active_for_creation`,
  [String(chainId), 2, deployed.factory, deploymentBlock, deploymentTransactionHash, JSON.stringify(manifest), shouldActivate],
);
console.log(`Registered ArcSignal V2 on chain ${chainId}; active_for_creation=${shouldActivate}.`);
