/**
 * Fresh ArcSignal V2 deployment on Arc mainnet, using the wallets in .env.local.
 *
 *   node scripts/deploy-fresh-v2.mjs              dry run (sends nothing)
 *   node scripts/deploy-fresh-v2.mjs --broadcast  real deployment
 *
 * Before sending it checks: the RPC is Arc mainnet, no known-compromised wallet is used,
 * every role address is set, and the deployer has enough USDC for gas. After a real
 * deployment it writes the new addresses to artifacts/deployments/arc-5042-v2-fresh.json
 * and prints the app settings to use. Private keys are never printed.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createPublicClient, http, keccak256, stringToHex, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

process.loadEnvFile('.env.local');
const broadcast = process.argv.includes('--broadcast');
const RPC = 'https://rpc.mainnet.arc.io';
const COMPROMISED = ['0x93c55fdc841835fb61b944c6970f334ad4a2a5d6', '0xa53ad24909d9e5f4ee015b90eaa0fba5c0b9a9a5'];
const MIN_GAS_USDC = 1.2; // dry run measured ~0.97 USDC at 45-50 gwei

function fail(message) {
  console.error(`STOP: ${message}`);
  process.exit(1);
}

const required = ['DEPLOYER_PRIVATE_KEY', 'RESOLVER_PRIVATE_KEY', 'PROTOCOL_ADMIN', 'PAUSE_GUARDIAN', 'SETTLEMENT_ARBITER',
  'PROTOCOL_TREASURY', 'MARKET_CREATOR', 'RESOLUTION_OPERATOR', 'SETTLEMENT_PROPOSER'];
for (const name of required) if (!process.env[name]?.trim()) fail(`${name} is missing in .env.local`);

const deployer = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY.trim()).address;
const operator = privateKeyToAccount(process.env.RESOLVER_PRIVATE_KEY.trim()).address;
const roles = {
  deployer, operator,
  admin: process.env.PROTOCOL_ADMIN.trim(), arbiter: process.env.SETTLEMENT_ARBITER.trim(), treasury: process.env.PROTOCOL_TREASURY.trim(),
  creator: process.env.MARKET_CREATOR.trim(), resolver: process.env.RESOLUTION_OPERATOR.trim(), proposer: process.env.SETTLEMENT_PROPOSER.trim(),
};
for (const [name, address] of Object.entries(roles)) {
  if (COMPROMISED.includes(address.toLowerCase())) fail(`${name} uses a compromised wallet (${address})`);
}
for (const name of ['creator', 'resolver', 'proposer']) {
  if (roles[name].toLowerCase() !== operator.toLowerCase()) fail(`${name} (${roles[name]}) must equal the operator key address ${operator}`);
}

const client = createPublicClient({ transport: http(RPC, { retryCount: 3, retryDelay: 1000 }) });
const chainId = await client.getChainId();
if (chainId !== 5042) fail(`RPC is chain ${chainId}, expected Arc mainnet 5042`);
const gasUsdc = Number(await client.getBalance({ address: deployer })) / 1e18;
console.log(`Deployer ${deployer}: ${gasUsdc} USDC for gas`);
if (broadcast && gasUsdc < MIN_GAS_USDC) fail(`deployer needs at least ${MIN_GAS_USDC} USDC for gas; it has ${gasUsdc}`);

const rulesURI = 'ipfs://arcsignal/oracle/settlement-v1';
const env = {
  ...process.env,
  FOUNDRY_PROFILE: 'arc',
  EXPECTED_CHAIN_ID: '5042',
  USDC_ADDRESS: '0x3600000000000000000000000000000000000000',
  SETTLEMENT_ORACLE: 'true',
  MAX_MARKET_COLLATERAL: '10000000000',
  MAX_PROTOCOL_COLLATERAL: '100000000000',
  MAX_INITIAL_LIQUIDITY: '1000000000',
  CATEGORY_METADATA_BASE_URI: 'https://arc-signal.xyz/categories',
  PROTOCOL_FEE_BPS: '50',
  LP_FEE_BPS: '100',
  ORACLE_IDENTIFIER: stringToHex('ARCSIGNAL_YES_NO', { size: 32 }),
  ORACLE_MIN_LIVENESS: '3600',
  ORACLE_MAX_LIVENESS: '604800',
  ORACLE_MIN_BOND: '25000000',
  ORACLE_RULES_URI: rulesURI,
  ORACLE_RULES_HASH: keccak256(toBytes(rulesURI)),
};
const forge = process.platform === 'win32' ? 'forge.exe' : 'forge';
const args = ['script', 'script/DeployArcSignalV2.s.sol', '--rpc-url', RPC, '--slow', ...(broadcast ? ['--broadcast'] : [])];
console.log(broadcast ? 'Broadcasting the real deployment...' : 'Dry run (nothing is sent)...');
const run = spawnSync(forge, args, { env, encoding: 'utf8' });
const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
const safeLines = output.split(/\r?\n/).filter((line) => !/private|0x[0-9a-fA-F]{64}\b(?!.*(hash|tx))/i.test(line) || /Hash|hash/.test(line));
const summary = safeLines.filter((l) => /Script ran|Estimated|Error|revert|STOP|Registry|Controller|Oracle|Deployer|Factory|Deployment block|ONCHAIN EXECUTION|Transactions saved|\[Success\]|Hash:/i.test(l));
console.log(summary.join('\n'));
if (run.status !== 0) fail('forge script failed; nothing further was done');

const pick = (label) => output.match(new RegExp(`${label}\\s+(0x[0-9a-fA-F]{40})`))?.[1] ?? null;
const deployed = {
  chainId,
  categoryRegistry: pick('CategoryRegistryV2'),
  oraclePolicyRegistry: pick('OraclePolicyRegistryV2'),
  feeController: pick('ProtocolFeeControllerV2'),
  settlementOracle: pick('Oracle'),
  marketDeployer: pick('ArcSignalMarketDeployerV2'),
  ammDeployer: pick('PredictionMarketAMMDeployerV2'),
  factory: pick('ArcSignalFactoryV2'),
  deploymentBlock: output.match(/NEXT_PUBLIC_ARCSIGNAL_V2_DEPLOYMENT_BLOCK\)\s+(\d+)/)?.[1] ?? null,
  roles: { admin: roles.admin, arbiter: roles.arbiter, treasury: roles.treasury, operator },
};
if (!broadcast) {
  console.log('\nDry run OK. Run again with --broadcast to deploy for real.');
  process.exit(0);
}
if (!deployed.factory) fail('could not read the deployed factory address from forge output; check broadcast/ for the receipts');
mkdirSync('artifacts/deployments', { recursive: true });
writeFileSync('artifacts/deployments/arc-5042-v2-fresh.json', `${JSON.stringify({ ...deployed, deployedAt: new Date().toISOString() }, null, 2)}\n`);
console.log('\nSaved artifacts/deployments/arc-5042-v2-fresh.json');
console.log('\nApp settings for the new deployment:');
console.log(`NEXT_PUBLIC_ARCSIGNAL_V2_FACTORY_ADDRESS=${deployed.factory}`);
console.log(`NEXT_PUBLIC_ARCSIGNAL_V2_DEPLOYMENT_BLOCK=${deployed.deploymentBlock}`);
console.log('ARCSIGNAL_V2_ORACLE_POLICY_VERSION=1');
console.log('ARCSIGNAL_MARKET_CREATION_VERSION=2');
