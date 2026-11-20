'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { formatUnits, type Address, type Hash } from 'viem';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { arcChain } from '@/lib/contracts';
import { ARCSIGNAL_MARKET_V2_ABI, OUTCOME_TOKEN_V2_ABI, PREDICTION_MARKET_AMM_V2_ABI } from '@/lib/contracts-v2';
import { planSell } from '@/lib/v2-market-math';
import { SLIPPAGE_BPS, formatUsdc, friendlyError, parseUsdc } from '@/lib/v2-trade-ui';
import { useWallet } from '@/hooks/useWallet';
import { useTradingDialog } from '@/components/layout/TradingDesign';

type Token = 'YES' | 'NO';
type Step = 'idle' | 'approving' | 'swapping' | 'merging' | 'success';
type Chain = {
  open: boolean;
  yesToken: Address;
  noToken: Address;
  reserves: { yes: bigint; no: bigint };
  fees: { protocol: bigint; lp: bigint };
  balances: { yes: bigint; no: bigint };
};

export function SellPositionModal({ marketAddress, ammAddress, question, onClose }: {
  marketAddress: Address;
  ammAddress: Address;
  question: string;
  onClose: () => void;
}) {
  const dialogRef = useTradingDialog(true);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: arcChain.id });
  const { isWrongNetwork, switchChain } = useWallet();
  const [chain, setChain] = useState<Chain | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [token, setToken] = useState<Token>('YES');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hash | null>(null);

  // Read everything from chain: indexed status can lag, and prices must be live.
  const load = useCallback(async () => {
    if (!publicClient || !address) return null;
    const read = (fn: 'marketStateIsOpen' | 'exposurePaused' | 'yesToken' | 'noToken') =>
      publicClient.readContract({ address: marketAddress, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: fn });
    const [open, paused, yesToken, noToken, reserves, protocolFee, lpFee] = await Promise.all([
      read('marketStateIsOpen'), read('exposurePaused'), read('yesToken'), read('noToken'),
      publicClient.readContract({ address: ammAddress, abi: PREDICTION_MARKET_AMM_V2_ABI, functionName: 'reserves' }),
      publicClient.readContract({ address: ammAddress, abi: PREDICTION_MARKET_AMM_V2_ABI, functionName: 'protocolFeeBps' }),
      publicClient.readContract({ address: ammAddress, abi: PREDICTION_MARKET_AMM_V2_ABI, functionName: 'lpFeeBps' }),
    ]);
    const balanceOf = (t: Address) => publicClient.readContract({ address: t, abi: OUTCOME_TOKEN_V2_ABI, functionName: 'balanceOf', args: [address] });
    const [yesBal, noBal] = await Promise.all([balanceOf(yesToken as Address), balanceOf(noToken as Address)]);
    const next: Chain = {
      open: Boolean(open) && !paused,
      yesToken: yesToken as Address,
      noToken: noToken as Address,
      reserves: { yes: reserves[0], no: reserves[1] },
      fees: { protocol: BigInt(protocolFee), lp: BigInt(lpFee) },
      balances: { yes: yesBal, no: noBal },
    };
    setChain(next);
    return next;
  }, [address, ammAddress, marketAddress, publicClient]);

  useEffect(() => {
    load().then((c) => {
      if (c && c.balances.yes === 0n && c.balances.no > 0n) setToken('NO');
    }).catch(() => setLoadError('Could not read your position from Arc. Please try again in a moment.'));
  }, [load]);

  const held = chain ? (token === 'YES' ? chain.balances.yes : chain.balances.no) : 0n;
  const pairsHeld = chain ? (chain.balances.yes < chain.balances.no ? chain.balances.yes : chain.balances.no) : 0n;
  const parsed = parseUsdc(amount);
  const amountRaw = parsed ?? 0n;
  const plan = chain && chain.open && amountRaw > 0n && amountRaw <= held
    ? planSell({
      amount: amountRaw,
      reserveHeld: token === 'YES' ? chain.reserves.yes : chain.reserves.no,
      reserveOther: token === 'YES' ? chain.reserves.no : chain.reserves.yes,
      protocolFeeBps: chain.fees.protocol,
      lpFeeBps: chain.fees.lp,
      slippageBps: SLIPPAGE_BPS,
    })
    : null;
  const validation = !chain ? null
    : !chain.open ? null
      : amount.length > 0 && parsed === null ? 'Enter a valid amount with up to 6 decimals.'
        : amountRaw > held ? `You only hold ${formatUsdc(held, token)}.`
          : amountRaw > 0n && !plan ? 'This amount is too small to sell.'
            : null;
  const busy = step !== 'idle' && step !== 'success';

  async function send(write: () => Promise<Hash>, failMessage: string) {
    const hash = await write();
    const receipt = await publicClient!.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error(failMessage);
    return hash;
  }

  async function run(action: 'sell' | 'merge') {
    if (isWrongNetwork) { switchChain?.({ chainId: arcChain.id }); return; }
    if (!walletClient || !address || !publicClient) return;
    try {
      setError(null);
      const live = await load();
      if (!live) throw new Error('Wallet not connected.');
      let lastHash: Hash;
      if (action === 'merge') {
        const pairs = live.balances.yes < live.balances.no ? live.balances.yes : live.balances.no;
        if (pairs <= 0n) throw new Error('You need both YES and NO tokens to merge.');
        setStep('merging');
        lastHash = await send(() => walletClient.writeContract({
          account: address, chain: arcChain, address: marketAddress, abi: ARCSIGNAL_MARKET_V2_ABI,
          functionName: 'redeemPairs', args: [pairs, address],
        }), 'Merge failed on-chain.');
        toast.success(`Merged ${formatUsdc(pairs, 'pairs')} into ${formatUsdc(pairs)}.`);
      } else {
        if (!live.open) throw new Error('MarketUnavailable');
        const sellYes = token === 'YES';
        const fresh = planSell({
          amount: amountRaw,
          reserveHeld: sellYes ? live.reserves.yes : live.reserves.no,
          reserveOther: sellYes ? live.reserves.no : live.reserves.yes,
          protocolFeeBps: live.fees.protocol,
          lpFeeBps: live.fees.lp,
          slippageBps: SLIPPAGE_BPS,
        });
        if (!fresh) throw new Error('This amount is too small to sell.');
        const heldToken = sellYes ? live.yesToken : live.noToken;
        const allowance = await publicClient.readContract({ address: heldToken, abi: OUTCOME_TOKEN_V2_ABI, functionName: 'allowance', args: [address, ammAddress] });
        if (allowance < fresh.swapIn) {
          setStep('approving');
          await send(() => walletClient.writeContract({
            account: address, chain: arcChain, address: heldToken, abi: OUTCOME_TOKEN_V2_ABI,
            functionName: 'approve', args: [ammAddress, fresh.swapIn],
          }), 'Approval failed on-chain.');
        }
        setStep('swapping');
        await send(() => walletClient.writeContract({
          account: address, chain: arcChain, address: ammAddress, abi: PREDICTION_MARKET_AMM_V2_ABI,
          functionName: sellYes ? 'swapExactYesForNo' : 'swapExactNoForYes', args: [fresh.swapIn, fresh.minOut, address],
        }), 'Swap failed on-chain.');
        setStep('merging');
        lastHash = await send(() => walletClient.writeContract({
          account: address, chain: arcChain, address: marketAddress, abi: ARCSIGNAL_MARKET_V2_ABI,
          functionName: 'redeemPairs', args: [fresh.pairs, address],
        }), 'Merge into USDC failed on-chain. Your tokens are safe; try "Merge" again.');
        toast.success(`Sold for ${formatUsdc(fresh.pairs)}.`);
      }
      setTxHash(lastHash);
      setStep('success');
      setAmount('');
      await load();
    } catch (err) {
      const message = friendlyError(err);
      setError(message);
      setStep('idle');
      toast.error(message);
    }
  }

  const pricePerToken = plan && amountRaw > 0n ? Number(plan.pairs) / Number(amountRaw) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="sell-position-title" className="max-h-[calc(100dvh-24px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#403947] bg-[#1C1B1B] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#403947]/70 p-5">
          <div>
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#DDB7FF]">Exit your position</div>
            <h2 id="sell-position-title" className="mt-1 font-display text-xl font-bold text-[#F1EEF4]">Sell for USDC</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[#B0ABB5] hover:bg-white/5 hover:text-white" aria-label="Close sell dialog"><X size={20} /></button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm text-[#F1EEF4]">{question}</p>
          {loadError ? <p role="alert" className="text-sm text-[#FFB4AB]">{loadError}</p> : !chain ? (
            <p role="status" className="animate-pulse text-sm text-[#B0ABB5]">Reading your position from Arc…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="rounded-lg border border-[#403947] bg-[#131313] p-3"><span className="block font-sans text-[#B0ABB5]">You hold YES</span><strong className="text-[#4FDBC8]">{formatUsdc(chain.balances.yes, 'YES')}</strong></div>
                <div className="rounded-lg border border-[#403947] bg-[#131313] p-3"><span className="block font-sans text-[#B0ABB5]">You hold NO</span><strong className="text-[#F3A6C8]">{formatUsdc(chain.balances.no, 'NO')}</strong></div>
              </div>

              {chain.open ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Token to sell">
                    {(['YES', 'NO'] as const).map((t) => {
                      const bal = t === 'YES' ? chain.balances.yes : chain.balances.no;
                      return <button key={t} type="button" role="radio" aria-checked={token === t} disabled={bal === 0n || busy}
                        onClick={() => { setToken(t); setAmount(''); setError(null); }}
                        className={`min-h-[44px] rounded-xl border text-sm font-bold disabled:opacity-40 ${token === t ? 'border-[#DDB7FF] bg-[#DDB7FF]/15 text-[#F1EEF4]' : 'border-[#403947] text-[#B0ABB5]'}`}>Sell {t}</button>;
                    })}
                  </div>
                  <label htmlFor="sell-amount" className="block font-mono text-xs font-bold uppercase tracking-wider text-[#B0ABB5]">Tokens to sell</label>
                  <div className="flex items-center rounded-xl border border-[#403947] bg-[#252229] p-3 focus-within:border-[#DDB7FF]">
                    <input id="sell-amount" value={amount} onChange={(e) => { setAmount(e.target.value); setError(null); }} type="number" min="0" step="0.01" placeholder="0.00" className="min-w-0 flex-1 bg-transparent font-mono text-2xl font-bold text-[#F1EEF4] outline-none placeholder:text-[#B0ABB5]/30" />
                    <button type="button" onClick={() => setAmount(formatUnits(held, 6))} className="rounded-lg border border-[#DDB7FF]/30 bg-[#DDB7FF]/10 px-3 py-2 font-mono text-xs font-bold text-[#DDB7FF]">MAX</button>
                  </div>
                  {plan ? (
                    <div className="rounded-xl border border-[#4FDBC8]/30 bg-[#4FDBC8]/10 p-3 text-sm" aria-live="polite">
                      <strong className="text-[#4FDBC8]">You get at least ≈ {formatUsdc(plan.pairs)}</strong>
                      <span className="block text-xs text-[#B0ABB5]">About {pricePerToken !== null ? (pricePerToken * 100).toFixed(1) : '—'}¢ per {token} token, after fees and a 2.5% price-move cushion. Any small leftover {token === 'YES' ? 'NO' : 'YES'} dust stays in your wallet.</span>
                    </div>
                  ) : null}
                  <p className="text-xs text-[#B0ABB5]">Selling takes 2–3 wallet confirmations: approve (first time only), swap, then merge into USDC.</p>
                  <button type="button" onClick={() => void run('sell')} disabled={!plan || Boolean(validation) || busy || !walletClient}
                    className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#DDB7FF] px-4 font-mono text-xs font-bold uppercase tracking-wider text-[#131313] disabled:cursor-not-allowed disabled:opacity-45">
                    {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                    {step === 'approving' ? 'Approving…' : step === 'swapping' ? 'Swapping…' : step === 'merging' ? 'Merging into USDC…' : isWrongNetwork ? `Switch to ${arcChain.name}` : `Sell ${token}`}
                  </button>
                </div>
              ) : (
                <p className="rounded-xl border border-[#403947] p-3 text-sm text-[#B0ABB5]">
                  Trading is closed, so tokens can no longer be swapped. You can still merge matching YES + NO pairs back into USDC. A one-sided position waits for the result.
                </p>
              )}

              {pairsHeld > 0n ? (
                <button type="button" onClick={() => void run('merge')} disabled={busy || !walletClient}
                  className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[#DDB7FF]/40 text-sm font-bold text-[#DDB7FF] disabled:opacity-45">
                  Merge {formatUsdc(pairsHeld, 'YES+NO pairs')} into {formatUsdc(pairsHeld)}
                </button>
              ) : null}
            </>
          )}

          {(validation || error) && (
            <div role="alert" className="flex gap-2 rounded-xl border border-[#FFB4AB]/30 bg-[#FFB4AB]/10 p-3 text-sm text-[#FFB4AB]">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /><span>{error ?? validation}</span>
            </div>
          )}
          {txHash && (
            <a href={`${arcChain.blockExplorers.default.url}/tx/${txHash}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-[#4FDBC8]/30 bg-[#4FDBC8]/10 p-3 text-sm font-semibold text-[#4FDBC8]">
              <CheckCircle2 size={16} /> Done · View transaction
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
