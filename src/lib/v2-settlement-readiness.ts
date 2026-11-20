import type { Address, PublicClient } from 'viem';
import { ARCSIGNAL_FACTORY_V2_ABI, ORACLE_POLICY_REGISTRY_V2_ABI } from '@/lib/contracts-v2';

export type SettlementReadiness = { ready: true; adapter: Address; oracle: Address } | { ready: false; reason: string };

export function v2OraclePolicyVersion(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.ARCSIGNAL_V2_ORACLE_POLICY_VERSION ?? 1);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/**
 * A V2 market may only be created if it can actually be settled: settlement is switched on, the
 * oracle policy is active, and the policy's oracle is a real contract the adapter points to.
 * Mainnet on 2026-11-20 failed this: the oracle was a plain wallet, so every result request reverts.
 */
export async function checkV2SettlementReady(input: {
  client: Pick<PublicClient, 'readContract' | 'getCode'>;
  factory: Address;
  policyId: number;
  policyVersion: number;
  env?: Record<string, string | undefined>;
}): Promise<SettlementReadiness> {
  const env = input.env ?? process.env;
  if (env.ENABLE_V2_SETTLEMENT !== 'true') return { ready: false, reason: 'ENABLE_V2_SETTLEMENT is not true' };
  try {
    const registry = await input.client.readContract({ address: input.factory, abi: ARCSIGNAL_FACTORY_V2_ABI, functionName: 'oraclePolicyRegistry' }) as Address;
    const active = await input.client.readContract({ address: registry, abi: ORACLE_POLICY_REGISTRY_V2_ABI, functionName: 'isActive', args: [input.policyId, input.policyVersion] });
    if (!active) return { ready: false, reason: `Oracle policy ${input.policyId} v${input.policyVersion} is not active` };
    const policy = await input.client.readContract({ address: registry, abi: ORACLE_POLICY_REGISTRY_V2_ABI, functionName: 'getVersion', args: [input.policyId, input.policyVersion] }) as { adapter: Address; oracle: Address };
    const [adapterCode, oracleCode] = await Promise.all([input.client.getCode({ address: policy.adapter }), input.client.getCode({ address: policy.oracle })]);
    if (!adapterCode || adapterCode === '0x') return { ready: false, reason: 'Oracle adapter has no contract code' };
    if (!oracleCode || oracleCode === '0x') return { ready: false, reason: `Oracle ${policy.oracle} has no contract code, so results can never be requested` };
    return { ready: true, adapter: policy.adapter, oracle: policy.oracle };
  } catch (error) {
    return { ready: false, reason: `Could not verify V2 settlement: ${error instanceof Error ? error.message.slice(0, 160) : String(error)}` };
  }
}

/** Returns an error message when the RPC's chain differs from the configured one, else null. */
export function chainMismatch(rpcChainId: number | null, configuredChainId: number): string | null {
  if (rpcChainId === null) return 'Could not read the RPC chain id; refusing to index.';
  return rpcChainId === configuredChainId ? null
    : `RPC is chain ${rpcChainId} but ArcSignal is configured for chain ${configuredChainId}; refusing to index.`;
}
