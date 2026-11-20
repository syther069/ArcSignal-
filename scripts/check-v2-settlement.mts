/**
 * Read-only V2 settlement readiness check for Arc mainnet. Sends no transactions.
 *
 *   npx tsx scripts/check-v2-settlement.mts            (uses .env.local, then .env)
 *   npx tsx scripts/check-v2-settlement.mts 2          (check a specific oracle policy version)
 *
 * Prints whether new V2 markets could be settled, who holds each oracle role, whether the arbiter
 * and owner are contracts (multisigs), and whether the configured resolver key is the proposer.
 */
import { existsSync } from 'node:fs';
import { createPublicClient, http, parseAbi, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { checkV2SettlementReady, v2DisputeBond, v2OraclePolicyVersion } from '../src/lib/v2-settlement-readiness.ts';
import { SETTLEMENT_ORACLE_V2_ABI } from '../src/lib/settlement-oracle-abi.ts';

for (const file of ['.env.local', '.env']) if (existsSync(file)) process.loadEnvFile(file);

const rpc = process.env.NEXT_PUBLIC_ARC_RPC_URL?.trim() || 'https://rpc.mainnet.arc.io';
const factory = process.env.NEXT_PUBLIC_ARCSIGNAL_V2_FACTORY_ADDRESS?.trim() as Address | undefined;
if (!factory) throw new Error('NEXT_PUBLIC_ARCSIGNAL_V2_FACTORY_ADDRESS is not set');
const version = Number(process.argv[2] ?? v2OraclePolicyVersion());
const client = createPublicClient({ transport: http(rpc, { retryCount: 3, retryDelay: 1000 }) });
const isContract = async (a: Address) => Boolean((await client.getCode({ address: a }).catch(() => undefined))?.length && (await client.getCode({ address: a })) !== '0x');

const out: Record<string, unknown> = { chainId: await client.getChainId(), factory, policyVersion: version };
out.settlementFlagInEnv = process.env.ENABLE_V2_SETTLEMENT === 'true';
out.disputeBondUsdc = Number(v2DisputeBond()) / 1e6;

// Evaluate readiness as if the flag were on, so this works before the switch.
const readiness = await checkV2SettlementReady({ client, factory, policyId: 1, policyVersion: version, env: { ENABLE_V2_SETTLEMENT: 'true' } });
out.readiness = readiness;

if (readiness.ready) {
  const oracle = readiness.oracle;
  const read = (fn: 'proposer' | 'arbiter' | 'owner' | 'treasury') => client.readContract({ address: oracle, abi: SETTLEMENT_ORACLE_V2_ABI, functionName: fn }).catch(() => null) as Promise<Address | null>;
  const [proposer, arbiter, owner, treasury] = await Promise.all([read('proposer'), read('arbiter'), read('owner'), read('treasury')]);
  out.roles = { proposer, arbiter, owner, treasury };
  out.arbiterIsMultisigContract = arbiter ? await isContract(arbiter) : false;
  out.ownerIsMultisigContract = owner ? await isContract(owner) : false;
  const key = process.env.SETTLEMENT_PROPOSER_PRIVATE_KEY?.trim() || process.env.RESOLVER_PRIVATE_KEY?.trim();
  if (key && /^0x[0-9a-fA-F]{64}$/.test(key)) {
    const resolver = privateKeyToAccount(key as `0x${string}`).address;
    out.resolverAddress = resolver;
    out.resolverIsProposer = proposer?.toLowerCase() === resolver.toLowerCase();
    const usdcGas = await client.getBalance({ address: resolver }).catch(() => null);
    out.resolverGasBalanceUsdc = usdcGas === null ? null : Number(usdcGas) / 1e18;
  }
  const policyMin = await client.readContract({
    address: await client.readContract({ address: factory, abi: parseAbi(['function oraclePolicyRegistry() view returns (address)']), functionName: 'oraclePolicyRegistry' }),
    abi: parseAbi(['function getVersion(uint32,uint32) view returns ((address,address,address,bytes32,uint64,uint64,uint128,bytes32,string,bool))']),
    functionName: 'getVersion', args: [1, version],
  }).then((v) => Number((v as unknown as unknown[])[6]) / 1e6).catch(() => null);
  out.policyMinBondUsdc = policyMin;
  out.bondOk = policyMin === null ? null : Number(v2DisputeBond()) / 1e6 >= policyMin;
}

const singleOperator = process.env.ALLOW_SINGLE_OPERATOR === 'true' || process.env.NEXT_PUBLIC_V2_SINGLE_OPERATOR === 'true';
out.singleOperatorMode = singleOperator;
const rolesOk = singleOperator || (out.arbiterIsMultisigContract && out.ownerIsMultisigContract);
const ok = readiness.ready && rolesOk && out.resolverIsProposer && out.bondOk !== false;
out.verdict = ok ? (singleOperator ? 'READY (single-operator mode: one wallet proposes and decides disputes)' : 'READY: safe to set ENABLE_V2_SETTLEMENT=true') : 'NOT READY: see fields above';
console.log(JSON.stringify(out, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
