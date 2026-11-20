'use client';

import React, { useState } from 'react';
import { useAccount, usePublicClient, useReadContract, useWalletClient } from 'wagmi';
import type { Address, Hash } from 'viem';
import { Loader2, Scale } from 'lucide-react';
import toast from 'react-hot-toast';
import { arcChain } from '@/lib/contracts';
import { OUTCOME_TOKEN_V2_ABI } from '@/lib/contracts-v2';
import { MARKET_SETTLEMENT_ABI, SETTLEMENT_ORACLE_V2_ABI, type SettlementRequest } from '@/lib/settlement-oracle-abi';
import { settlementView, timeLeft, type SettlementView } from '@/lib/settlement-view';
import { formatUsdc, friendlyError } from '@/lib/v2-trade-ui';
import { useWallet } from '@/hooks/useWallet';

const ZERO_KEY = `0x${'0'.repeat(64)}`;

/** Presentational part, kept separate so it can be tested without a wallet. */
export function SettlementPanel({ view, bond, now, busy, onDispute, onFinalize }: {
  view: SettlementView; bond: bigint | null; now: number; busy: boolean; onDispute?: () => void; onFinalize?: () => void;
}) {
  const until = view.disputeUntil ? new Date(view.disputeUntil * 1000) : null;
  return <section aria-labelledby="settlement-title" className="rounded-2xl border border-[#403947] bg-[#1c1b1b] p-5 text-sm text-[#f1eef4]">
    <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#b0abb5]"><Scale size={14} /> Settlement</p>
    <h2 id="settlement-title" className="mt-1 text-lg font-semibold">{view.headline}</h2>
    <p className="mt-1 text-[#b0abb5]">{view.detail}</p>
    {view.stage === 'proposed' && until ? <p className="mt-2 text-sm">
      {view.canDispute ? <>Can be disputed until <strong>{until.toLocaleTimeString()}</strong> ({timeLeft(view.disputeUntil!, now)} left).</> : null}
    </p> : null}
    {view.canDispute && onDispute ? <div className="mt-3 rounded-xl border border-[#f2c66d]/30 bg-[#f2c66d]/5 p-3">
      <p className="text-xs text-[#f2c66d]">
        Think this result is wrong? You post {bond !== null ? formatUsdc(bond) : 'a bond'}. If the decision goes your way, you get it back.
        If not, it goes to the treasury. Only dispute with clear evidence from the stated source.
      </p>
      <button type="button" disabled={busy} onClick={onDispute}
        className="mt-2 inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[#f2c66d]/50 px-4 text-sm font-bold text-[#f2c66d] disabled:opacity-45">
        {busy ? <Loader2 size={14} className="animate-spin" /> : null} Dispute this result
      </button>
    </div> : null}
    {view.canFinalize && onFinalize ? <button type="button" disabled={busy} onClick={onFinalize}
      className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-[#ddb7ff] px-4 text-sm font-bold text-[#131313] disabled:opacity-45">
      {busy ? <Loader2 size={14} className="animate-spin" /> : null} Finalize result
    </button> : null}
  </section>;
}

/** Live settlement status for a V2 market, read from its oracle on chain. */
export default function SettlementStatus({ marketAddress, onChange }: { marketAddress: Address; onChange?: () => void }) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: arcChain.id });
  const { isWrongNetwork, switchChain } = useWallet();
  const [busy, setBusy] = useState(false);
  const read = { chainId: arcChain.id, query: { refetchInterval: 15_000 } } as const;

  const { data: adapter } = useReadContract({ ...read, address: marketAddress, abi: MARKET_SETTLEMENT_ABI, functionName: 'oracleAdapter' });
  const { data: key } = useReadContract({ ...read, address: marketAddress, abi: MARKET_SETTLEMENT_ABI, functionName: 'oracleRequestKey' });
  const hasKey = Boolean(adapter && key && key !== ZERO_KEY);
  const { data: request, refetch } = useReadContract({
    ...read, address: adapter as Address, abi: SETTLEMENT_ORACLE_V2_ABI, functionName: 'getRequest', args: [key as Hash],
    query: { enabled: hasKey, refetchInterval: 15_000 },
  });
  const { data: bondToken } = useReadContract({ ...read, address: adapter as Address, abi: SETTLEMENT_ORACLE_V2_ABI, functionName: 'bondToken', query: { enabled: Boolean(adapter) } });

  const now = Math.floor(Date.now() / 1000);
  const req = hasKey && request ? request as unknown as SettlementRequest : null;
  const view = settlementView(req, now, process.env.NEXT_PUBLIC_V2_SINGLE_OPERATOR === 'true');

  async function send(label: string, fn: () => Promise<Hash>) {
    const hash = await fn();
    const receipt = await publicClient!.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error(`${label} failed on-chain.`);
  }

  async function act(kind: 'dispute' | 'finalize') {
    if (isWrongNetwork) { switchChain?.({ chainId: arcChain.id }); return; }
    if (!walletClient || !address || !publicClient || !adapter || !key) { toast.error('Connect your wallet first.'); return; }
    setBusy(true);
    try {
      if (kind === 'dispute' && req) {
        const token = bondToken as Address;
        const allowance = await publicClient.readContract({ address: token, abi: OUTCOME_TOKEN_V2_ABI, functionName: 'allowance', args: [address, adapter as Address] });
        if (allowance < req.bond) {
          await send('Bond approval', () => walletClient.writeContract({ account: address, chain: arcChain, address: token, abi: OUTCOME_TOKEN_V2_ABI, functionName: 'approve', args: [adapter as Address, req.bond] }));
        }
        await send('Dispute', () => walletClient.writeContract({ account: address, chain: arcChain, address: adapter as Address, abi: SETTLEMENT_ORACLE_V2_ABI, functionName: 'disputeOutcome', args: [key as Hash] }));
        toast.success('Dispute filed. The arbiter will decide.');
      } else {
        await send('Finalize', () => walletClient.writeContract({ account: address, chain: arcChain, address: marketAddress, abi: MARKET_SETTLEMENT_ABI, functionName: 'settleResolution' }));
        toast.success('Result finalized.');
      }
      await refetch();
      onChange?.();
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  return <SettlementPanel view={view} bond={req?.bond ?? null} now={now} busy={busy}
    onDispute={() => void act('dispute')} onFinalize={() => void act('finalize')} />;
}
