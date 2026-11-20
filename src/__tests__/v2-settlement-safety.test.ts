import { describe, expect, it, vi } from 'vitest';
import { chainMismatch, checkV2SettlementReady, v2OraclePolicyVersion } from '@/lib/v2-settlement-readiness';
import { summarizeResolution } from '@/lib/market-insight';

const FACTORY = '0x43c47ca560042b48fce3af75fac63b1967822225';
const REGISTRY = '0x70b84b5b24973d8388f355c03aaeebc5af788a69';
const ADAPTER = '0xb0457fa7b49a462315d1efb4ac0669aa91531b43';
const WALLET = '0x93c55fdc841835fb61b944c6970f334ad4a2a5d6';
const ORACLE = '0x1111111111111111111111111111111111111111';

function client(opts: { active?: boolean; oracle?: string; codeAt?: string[] }) {
  return {
    readContract: vi.fn(async ({ functionName }: { functionName: string }) => {
      if (functionName === 'oraclePolicyRegistry') return REGISTRY;
      if (functionName === 'isActive') return opts.active ?? true;
      if (functionName === 'getVersion') return { adapter: ADAPTER, oracle: opts.oracle ?? ORACLE };
      throw new Error(`unexpected ${functionName}`);
    }),
    getCode: vi.fn(async ({ address }: { address: string }) => (opts.codeAt ?? []).includes(address) ? '0x6080' : undefined),
  };
}
const on = { ENABLE_V2_SETTLEMENT: 'true' };

describe('V2 settlement readiness', () => {
  it('blocks when settlement is switched off, without touching the chain', async () => {
    const c = client({ codeAt: [ADAPTER, ORACLE] });
    expect(await checkV2SettlementReady({ client: c as never, factory: FACTORY, policyId: 1, policyVersion: 1, env: {} })).toMatchObject({ ready: false });
    expect(c.readContract).not.toHaveBeenCalled();
  });
  it('blocks the mainnet setup found on 2026-11-20: oracle is a plain wallet', async () => {
    const r = await checkV2SettlementReady({ client: client({ oracle: WALLET, codeAt: [ADAPTER] }) as never, factory: FACTORY, policyId: 1, policyVersion: 1, env: on });
    expect(r).toMatchObject({ ready: false, reason: expect.stringContaining('no contract code') });
  });
  it('blocks an inactive policy and a codeless adapter', async () => {
    expect(await checkV2SettlementReady({ client: client({ active: false, codeAt: [ADAPTER, ORACLE] }) as never, factory: FACTORY, policyId: 1, policyVersion: 2, env: on })).toMatchObject({ ready: false });
    expect(await checkV2SettlementReady({ client: client({ codeAt: [ORACLE] }) as never, factory: FACTORY, policyId: 1, policyVersion: 1, env: on })).toMatchObject({ ready: false });
  });
  it('allows a real oracle contract on an active policy', async () => {
    expect(await checkV2SettlementReady({ client: client({ codeAt: [ADAPTER, ORACLE] }) as never, factory: FACTORY, policyId: 1, policyVersion: 2, env: on }))
      .toEqual({ ready: true, adapter: ADAPTER, oracle: ORACLE });
  });
  it('treats chain read errors as not ready', async () => {
    const c = { readContract: vi.fn().mockRejectedValue(new Error('rpc down')), getCode: vi.fn() };
    expect(await checkV2SettlementReady({ client: c as never, factory: FACTORY, policyId: 1, policyVersion: 1, env: on })).toMatchObject({ ready: false, reason: expect.stringContaining('rpc down') });
  });
  it('reads the policy version from settings', () => {
    expect(v2OraclePolicyVersion({ ARCSIGNAL_V2_ORACLE_POLICY_VERSION: '2' })).toBe(2);
    expect(v2OraclePolicyVersion({ ARCSIGNAL_V2_ORACLE_POLICY_VERSION: 'x' })).toBe(1);
  });
});

describe('V2 indexer chain guard', () => {
  it('refuses to index another network as this one', () => {
    expect(chainMismatch(5042, 5042)).toBeNull();
    expect(chainMismatch(5042002, 5042)).toContain('refusing to index');
    expect(chainMismatch(null, 5042)).toContain('refusing to index');
  });
});

describe('honest settlement wording', () => {
  it('says plainly when V2 settlement is not live', () => {
    const s = summarizeResolution({ isV2: true, category: 'crypto', voidAfterSeconds: 10_800, settlementLive: false });
    expect(s.who).toContain('not live');
    expect(s.trustNote).toContain('cannot pay out a winning side');
    expect(s.ifUnclear).toContain('3 hours');
  });
  it('keeps the normal wording when it is live or unknown', () => {
    expect(summarizeResolution({ isV2: true, category: 'crypto', settlementLive: true }).who).toContain('operator proposes');
    expect(summarizeResolution({ isV2: true, category: 'crypto' }).who).toContain('operator proposes');
  });
});
