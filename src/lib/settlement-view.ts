/** Turns an on-chain settlement request into what the market page shows. Pure. */
import { ORACLE_NO_PRICE, ORACLE_YES_PRICE, SETTLEMENT_REQUEST_STATE } from '@/lib/settlement-oracle-abi';

export type SettlementView = {
  stage: 'not-requested' | 'waiting' | 'proposed' | 'disputed' | 'settled';
  headline: string;
  detail: string;
  proposed: 'YES' | 'NO' | 'VOID' | null;
  disputeUntil: number | null;
  canDispute: boolean;
  canFinalize: boolean;
};

export function priceLabel(price: bigint): 'YES' | 'NO' | 'VOID' {
  return price === ORACLE_YES_PRICE ? 'YES' : price === ORACLE_NO_PRICE ? 'NO' : 'VOID';
}

export function settlementView(req: { state: number; proposedAt: bigint; liveness: bigint; proposedPrice: bigint; settledPrice: bigint } | null, now: number): SettlementView {
  const stage = req ? SETTLEMENT_REQUEST_STATE[req.state] ?? 'NONE' : 'NONE';
  if (!req || stage === 'NONE') {
    return { stage: 'not-requested', headline: 'Result not requested yet', detail: 'The result is requested automatically shortly after the market closes.', proposed: null, disputeUntil: null, canDispute: false, canFinalize: false };
  }
  if (stage === 'REQUESTED') {
    return { stage: 'waiting', headline: 'Waiting for the result', detail: 'The operator proposes the result from the stated source, usually within minutes of closing.', proposed: null, disputeUntil: null, canDispute: false, canFinalize: false };
  }
  const proposed = priceLabel(req.proposedPrice);
  const until = Number(req.proposedAt + req.liveness);
  if (stage === 'PROPOSED') {
    const open = now < until;
    return {
      stage: 'proposed',
      headline: `Proposed result: ${proposed}`,
      detail: open ? 'Anyone can dispute this result until the time shown by posting a bond.' : 'The dispute window has passed. The result can now be finalized.',
      proposed, disputeUntil: until, canDispute: open, canFinalize: !open,
    };
  }
  if (stage === 'DISPUTED') {
    return { stage: 'disputed', headline: `Disputed (proposed ${proposed})`, detail: 'A multisig arbiter will decide the final result. Trading and claims wait until then.', proposed, disputeUntil: until, canDispute: false, canFinalize: false };
  }
  const final = priceLabel(req.settledPrice);
  return { stage: 'settled', headline: final === 'VOID' ? 'Settled as void' : `Final result: ${final}`, detail: final === 'VOID' ? 'Holders can redeem their collateral.' : `${final} holders can redeem 1 USDC per token.`, proposed, disputeUntil: until, canDispute: false, canFinalize: false };
}

export function timeLeft(until: number, now: number): string {
  const s = Math.max(0, until - now);
  if (s < 60) return 'under a minute';
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
