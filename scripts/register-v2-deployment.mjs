import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  throw new Error('DATABASE_URL or POSTGRES_URL is required');
}

const broadcastPath = join(
  process.cwd(),
  'broadcast',
  'DeployArcSignalV2.s.sol',
  '5042002',
  'run-latest.json',
);
const broadcast = JSON.parse(readFileSync(broadcastPath, 'utf8'));
const transactions = Array.isArray(broadcast.transactions) ? broadcast.transactions : [];
const receipts = Array.isArray(broadcast.receipts) ? broadcast.receipts : [];

function blockNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.startsWith('0x')) return Number(BigInt(value));
  return Number(value);
}

const contracts = {};
let factoryTransactionHash = null;
let deploymentBlock = null;

for (let index = 0; index < transactions.length; index += 1) {
  const transaction = transactions[index];
  if (!transaction?.contractName || !transaction?.contractAddress) continue;
  contracts[transaction.contractName] = transaction.contractAddress;
  const receipt = receipts[index];
  if (deploymentBlock === null && receipt?.blockNumber) {
    deploymentBlock = blockNumber(receipt.blockNumber);
  }
  if (transaction.contractName === 'ArcSignalFactoryV2' && !factoryTransactionHash) {
    factoryTransactionHash = receipt?.transactionHash ?? transaction.hash ?? null;
  }
}

if (!contracts.ArcSignalFactoryV2 || !factoryTransactionHash || deploymentBlock === null) {
  throw new Error('Factory deployment data was not found in the broadcast manifest');
}

const manifest = {
  deploymentKind: 'arc-testnet-demo',
  note: 'ArcSignal V2 testnet deployment using Arc official testnet RPC, chain ID, USDC, and a testnet-only optimistic oracle shim because the official Circle sample states UMA infra is not native on Arc Testnet.',
  contracts,
  officialArc: {
    chainId: 5042002,
    rpc: 'https://rpc.testnet.arc.io',
    usdc: '0x3600000000000000000000000000000000000000',
  },
  fees: { protocolFeeBps: 50, lpFeeBps: 100 },
};

await sql.query(
  `
    insert into protocol_deployments (
      chain_id, protocol_version, factory_address, deployment_block,
      deployment_tx_hash, bytecode_manifest, active_for_creation
    ) values ($1, $2, $3, $4, $5, $6::jsonb, $7)
    on conflict (chain_id, protocol_version) do update set
      factory_address = excluded.factory_address,
      deployment_block = excluded.deployment_block,
      deployment_tx_hash = excluded.deployment_tx_hash,
      bytecode_manifest = excluded.bytecode_manifest,
      active_for_creation = excluded.active_for_creation
  `,
  [
    '5042002',
    2,
    contracts.ArcSignalFactoryV2,
    String(deploymentBlock),
    factoryTransactionHash,
    JSON.stringify(manifest),
    true,
  ],
);

const rows = await sql.query(
  `select chain_id, protocol_version, factory_address, deployment_block, active_for_creation
   from protocol_deployments where chain_id = $1 and protocol_version = $2`,
  ['5042002', 2],
);
console.log(JSON.stringify(rows, null, 2));
