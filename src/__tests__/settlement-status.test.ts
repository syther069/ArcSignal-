import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { settlementView, timeLeft } from '@/lib/settlement-view';
import { SettlementPanel } from '@/components/markets/SettlementStatus';
import { summarizeResolution } from '@/lib/market-insight';

const YES = 10n ** 18n;
const NOW = 1_800_000_000;
const req = (state: number, over: Partial<{ proposedAt: bigint; proposedPrice: bigint; settledPrice: bigint }> = {}) => ({
  state, proposedAt: BigInt(NOW - 600), liveness: 3600n, proposedPrice: YES, settledPrice: 0n, ...over,
});

describe('settlement view', () => {
  it('walks through every stage in plain words', () => {
    expect(settlementView(null, NOW).stage).toBe('not-requested');
    expect(settlementView(req(1), NOW)).toMatchObject({ stage: 'waiting', canDispute: false });
    expect(settlementView(req(2), NOW)).toMatchObject({ stage: 'proposed', headline: 'Proposed result: YES', canDispute: true, canFinalize: false, disputeUntil: NOW + 3000 });
    expect(settlementView(req(2, { proposedAt: BigInt(NOW - 4000) }), NOW)).toMatchObject({ canDispute: false, canFinalize: true });
    expect(settlementView(req(3), NOW)).toMatchObject({ stage: 'disputed', canDispute: false, canFinalize: false });
    expect(settlementView(req(4, { settledPrice: 0n }), NOW).headline).toBe('Final result: NO');
    expect(settlementView(req(4, { settledPrice: 5n * 10n ** 17n }), NOW).headline).toBe('Settled as void');
  });
  it('shows time left simply', () => {
    expect(timeLeft(NOW + 30, NOW)).toBe('under a minute');
    expect(timeLeft(NOW + 52 * 60, NOW)).toBe('52 min');
    expect(timeLeft(NOW + 90 * 60, NOW)).toBe('1 h 30 min');
  });
});

describe('settlement panel', () => {
  it('offers a dispute only while the window is open, and explains the bond', () => {
    const open = renderToStaticMarkup(createElement(SettlementPanel, { view: settlementView(req(2), NOW), bond: 25_000_000n, now: NOW, busy: false, onDispute: () => {}, onFinalize: () => {} }));
    for (const t of ['Proposed result: YES', 'Dispute this result', '25 USDC', 'you get it back', '50 min left']) expect(open).toContain(t);
    expect(open).not.toContain('Finalize result');
    const closed = renderToStaticMarkup(createElement(SettlementPanel, { view: settlementView(req(2, { proposedAt: BigInt(NOW - 4000) }), NOW), bond: 25_000_000n, now: NOW, busy: false, onDispute: () => {}, onFinalize: () => {} }));
    expect(closed).not.toContain('Dispute this result');
    expect(closed).toContain('Finalize result');
  });
  it('shows no buttons while disputed', () => {
    const html = renderToStaticMarkup(createElement(SettlementPanel, { view: settlementView(req(3), NOW), bond: 25_000_000n, now: NOW, busy: false, onDispute: () => {}, onFinalize: () => {} }));
    expect(html).toContain('multisig arbiter');
    expect(html).not.toContain('<button');
  });
});

describe('live settlement wording', () => {
  it('explains disputes and the arbiter once settlement is live', () => {
    const s = summarizeResolution({ isV2: true, category: 'crypto', livenessSeconds: 3600, settlementLive: true });
    expect(s.disputeWindow).toContain('Anyone can dispute');
    expect(s.trustNote).toContain('multisig arbiter');
  });
});

describe('single-operator honesty', () => {
  it('says plainly that one operator decides results and disputes', () => {
    const s = summarizeResolution({ isV2: true, category: 'crypto', livenessSeconds: 3600, settlementLive: true, singleOperator: true });
    expect(s.trustNote).toContain('one ArcSignal operator wallet both proposes results and decides disputes');
    expect(settlementView(req(3), NOW, true).detail).toContain('operator will review the dispute');
  });
});
