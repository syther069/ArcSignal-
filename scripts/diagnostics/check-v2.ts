import * as dotenv from 'dotenv';
import { resolve } from 'node:path';
import { createPublicClient, http, isAddress, parseAbi, type Address } from 'viem';
import { arcTestnet, USDC_ADDRESS } from '../../src/lib/contracts';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const factoryAbi = parseAbi([
  'function PROTOCOL_VERSION() view returns (uint256)',
  'function collateral() view returns (address)',
  'function categoryRegistry() view returns (address)',
  'function oraclePolicyRegistry() view returns (address)',
  'function feeController() view returns (address)',
  'function marketDeployer() view returns (address)',
  'function ammDeployer() view returns (address)',
  'function globalExposurePaused() view returns (bool)',
  'function hasRole(bytes32 role,address account) view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function MARKET_CREATOR_ROLE() view returns (bytes32)',
  'function RESOLUTION_OPERATOR_ROLE() view returns (bytes32)',
  'function PAUSER_ROLE() view returns (bytes32)',
]);

function requiredAddress(name: string): Address {
  const value = process.env[name]
    ?? (name === 'ARCSIGNAL_V2_FACTORY_ADDRESS'
      ? process.env.NEXT_PUBLIC_ARCSIGNAL_V2_FACTORY_ADDRESS
      : undefined);
  if (!value || !isAddress(value)) throw new Error(`${name} must be a valid address`);
  return value;
}

async function main() {
  const factory = requiredAddress('ARCSIGNAL_V2_FACTORY_ADDRESS');
  const rpcUrl = process.env.ARC_RPC_URL
    ?? process.env.ARC_TESTNET_RPC_URL
    ?? process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL
    ?? 'https://rpc.testnet.arc.io';
  const client = createPublicClient({ chain: arcTestnet, transport: http(rpcUrl) });
  const code = await client.getCode({ address: factory });
  if (!code || code === '0x') throw new Error(`No contract bytecode at ${factory}`);

  const [
    version,
    collateral,
    categoryRegistry,
    oraclePolicyRegistry,
    feeController,
    marketDeployer,
    ammDeployer,
    paused,
    adminRole,
    creatorRole,
    resolverRole,
    pauserRole,
  ] = await Promise.all([
    client.readContract({ address: factory, abi: factoryAbi, functionName: 'PROTOCOL_VERSION' }),
    client.readContract({ address: factory, abi: factoryAbi, functionName: 'collateral' }),
    client.readContract({ address: factory, abi: factoryAbi, functionName: 'categoryRegistry' }),
    client.readContract({ address: factory, abi: factoryAbi, functionName: 'oraclePolicyRegistry' }),
    client.readContract({ address: factory, abi: factoryAbi, functionName: 'feeController' }),
    client.readContract({ address: factory, abi: factoryAbi, functionName: 'marketDeployer' }),
    client.readContract({ address: factory, abi: factoryAbi, functionName: 'ammDeployer' }),
    client.readContract({ address: factory, abi: factoryAbi, functionName: 'globalExposurePaused' }),
    client.readContract({ address: factory, abi: factoryAbi, functionName: 'DEFAULT_ADMIN_ROLE' }),
    client.readContract({ address: factory, abi: factoryAbi, functionName: 'MARKET_CREATOR_ROLE' }),
    client.readContract({ address: factory, abi: factoryAbi, functionName: 'RESOLUTION_OPERATOR_ROLE' }),
    client.readContract({ address: factory, abi: factoryAbi, functionName: 'PAUSER_ROLE' }),
  ]);

  if (version !== 2n) throw new Error(`Unexpected protocol version ${version}`);
  const expectedUsdc = process.env.USDC_ADDRESS ?? process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS ?? USDC_ADDRESS;
  if (!isAddress(expectedUsdc) || collateral.toLowerCase() !== expectedUsdc.toLowerCase()) {
    throw new Error(`Factory collateral ${collateral} does not match configured USDC ${expectedUsdc}`);
  }
  for (const [name, address] of Object.entries({ categoryRegistry, oraclePolicyRegistry, feeController, marketDeployer, ammDeployer })) {
    const dependencyCode = await client.getCode({ address });
    if (!dependencyCode || dependencyCode === '0x') throw new Error(`${name} has no bytecode at ${address}`);
  }

  const roleChecks = await Promise.all([
    [adminRole, requiredAddress('PROTOCOL_ADMIN'), 'PROTOCOL_ADMIN'],
    [creatorRole, requiredAddress('MARKET_CREATOR'), 'MARKET_CREATOR'],
    [resolverRole, requiredAddress('RESOLUTION_OPERATOR'), 'RESOLUTION_OPERATOR'],
    [pauserRole, requiredAddress('PAUSE_GUARDIAN'), 'PAUSE_GUARDIAN'],
  ].map(async ([role, account, label]) => ({
    label,
    account,
    assigned: await client.readContract({
      address: factory,
      abi: factoryAbi,
      functionName: 'hasRole',
      args: [role as `0x${string}`, account as Address],
    }),
  })));
  const missing = roleChecks.filter((check) => !check.assigned);
  if (missing.length > 0) throw new Error(`Missing V2 roles: ${missing.map((check) => check.label).join(', ')}`);

  console.log(JSON.stringify({
    ok: true,
    chainId: arcTestnet.id,
    factory,
    version: version.toString(),
    collateral,
    dependencies: { categoryRegistry, oraclePolicyRegistry, feeController, marketDeployer, ammDeployer },
    globalExposurePaused: paused,
    roles: roleChecks,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
