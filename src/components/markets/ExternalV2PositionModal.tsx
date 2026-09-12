'use client';

import React, { useEffect, useState } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { formatUnits, parseUnits, type Address, type Hash } from 'viem';
import { AlertCircle, ArrowRight, CheckCircle2, DollarSign, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ArcSignalLiveMarket } from '@/lib/markets/liveMarketTypes';
import { arcTestnet } from '@/lib/contracts';
import { USDC_ABI, USDC_ADDRESS } from '@/lib/usdc';
import { ARCSIGNAL_MARKET_V2_ABI, OUTCOME_TOKEN_V2_ABI, PREDICTION_MARKET_AMM_V2_ABI } from '@/lib/contracts-v2';
import { quoteV2ExactInput } from '@/lib/v2-market-math';
import { useWallet } from '@/hooks/useWallet';
import { useArcUsdcBalance } from '@/hooks/useArcUsdcBalance';
import { useFundUSDCModalLoader } from '@/hooks/useFundUSDCModalLoader';
import { useTradingDialog } from '@/components/layout/TradingDesign';

type PositionSide = 'FOLLOW' | 'FADE';
type Step = 'idle' | 'approving-usdc' | 'minting' | 'approving-outcome' | 'swapping' | 'success';

const SLIPPAGE_BPS = 250n;
const BPS = 10_000n;
const MIN_POSITION = parseUnits('1', 6);

function isAddress(value: string | undefined): value is Address {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));
}

function parseUsdc(value: string) {
  if (!/^\d*(?:\.\d{0,6})?$/.test(value)) return null;
  try {
    return value && Number(value) > 0 ? parseUnits(value, 6) : 0n;
  } catch {
    return null;
  }
}

function formatUsdc(value: bigint | number | undefined) {
  if (value === undefined) return '—';
  if (typeof value === 'bigint') return `${Number(formatUnits(value, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`;
}

function friendlyError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();
  if (lower.includes('user rejected') || lower.includes('user denied')) return 'Transaction cancelled in wallet.';
  if (lower.includes('slippage')) return 'The AMM price moved or liquidity is too thin. Try a smaller amount.';
  if (lower.includes('insufficient') || lower.includes('exceeds the balance')) return 'Insufficient USDC balance for this position.';
  if (lower.includes('allowance')) return 'Allowance is too low. Please approve again.';
  if (lower.includes('marketunavailable') || lower.includes('invalidstate')) return 'This Arc V2 market is not open for trading.';
  if (lower.includes('failed to fetch') || lower.includes('network')) return 'Network error — please check your connection and try again.';
  const first = raw.split(/(?:Details:|Docs:|Contract Call:|Version:)/i)[0].trim();
  return first.length > 140 ? `${first.slice(0, 137)}…` : first || 'Something went wrong. Please try again.';
}

export function ExternalV2PositionModal({
  market,
  initialSide,
  onClose,
}: {
  market: ArcSignalLiveMarket;
  initialSide: PositionSide;
  onClose: () => void;
}) {
  const dialogRef = useTradingDialog(true);
  const [amount, setAmount] = useState('');
  const [side, setSide] = useState<PositionSide>(initialSide);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [reserves, setReserves] = useState<{ yes: bigint; no: bigint } | null>(null);
  const [fees, setFees] = useState<{ protocol: bigint; lp: bigint } | null>(null);
  const [tokenAddresses, setTokenAddresses] = useState<{ yes: Address; no: Address } | null>(null);
  const [txHash, setTxHash] = useState<Hash | null>(null);
  const [fundingOpen, setFundingOpen] = useState(false);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: arcTestnet.id });
  const { isWrongNetwork, switchChain } = useWallet();
  const { erc20Raw, refetch: refetchWalletUsdc } = useArcUsdcBalance(address);
  const { FundUSDCModal, loadFundUSDCModal } = useFundUSDCModalLoader();

  const marketAddress = market.arcSettlement?.marketAddress;
  const ammAddress = market.arcSettlement?.ammAddress;
  const readyAddresses = isAddress(marketAddress) && isAddress(ammAddress);
  const parsedAmount = parseUsdc(amount);
  const amountRaw = parsedAmount ?? 0n;
  const invalidAmount = amount.length > 0 && parsedAmount === null;
  const balance = erc20Raw ?? 0n;
  const suggestedSide = market.aiSuggestedSide === 'NO' ? 'FADE' : 'FOLLOW';

  useEffect(() => {
    if (!publicClient || !readyAddresses) return;
    let cancelled = false;
    void (async () => {
      try {
        const [state, yesToken, noToken, reserveValues, protocolFeeBps, lpFeeBps] = await Promise.all([
          publicClient.readContract({ address: marketAddress, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'marketState' }),
          publicClient.readContract({ address: marketAddress, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'yesToken' }),
          publicClient.readContract({ address: marketAddress, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'noToken' }),
          publicClient.readContract({ address: ammAddress, abi: PREDICTION_MARKET_AMM_V2_ABI, functionName: 'reserves' }),
          publicClient.readContract({ address: ammAddress, abi: PREDICTION_MARKET_AMM_V2_ABI, functionName: 'protocolFeeBps' }),
          publicClient.readContract({ address: ammAddress, abi: PREDICTION_MARKET_AMM_V2_ABI, functionName: 'lpFeeBps' }),
        ]);
        if (cancelled) return;
        setTokenAddresses({ yes: yesToken as Address, no: noToken as Address });
        setReserves({ yes: reserveValues[0], no: reserveValues[1] });
        setFees({ protocol: BigInt(protocolFeeBps), lp: BigInt(lpFeeBps) });
        if (Number(state) !== 0) setError('This Arc V2 market is not open for new positions.');
      } catch (err) {
        if (!cancelled) setError(friendlyError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ammAddress, marketAddress, publicClient, readyAddresses]);

  let quote = 0n;
  if (reserves && fees && amountRaw > 0n) {
    const inputTokenReserve = side === 'FOLLOW' ? reserves.no : reserves.yes;
    const outputTokenReserve = side === 'FOLLOW' ? reserves.yes : reserves.no;
    quote = quoteV2ExactInput({
      amountIn: amountRaw,
      reserveIn: inputTokenReserve,
      reserveOut: outputTokenReserve,
      protocolFeeBps: fees.protocol,
      lpFeeBps: fees.lp,
    });
  }

  const finalExposure = amountRaw + quote;
  const minOut = quote * (BPS - SLIPPAGE_BPS) / BPS;
  const hasLiquidity = Boolean(reserves && reserves.yes > 0n && reserves.no > 0n);
  const needsFunding = amountRaw > 0n && erc20Raw !== null && amountRaw > balance;
  const validation = !readyAddresses
    ? 'This external market has not been mirrored into Arc V2 yet.'
    : !hasLiquidity
      ? 'This mirrored Arc V2 market needs AMM liquidity before directional positions can be placed.'
      : invalidAmount
        ? 'Enter a valid USDC amount with up to 6 decimals.'
        : amountRaw > 0n && amountRaw < MIN_POSITION
          ? 'Minimum position is 1.00 USDC.'
          : needsFunding
            ? 'Insufficient ERC-20 USDC balance.'
            : null;
  const canSubmit = Boolean(walletClient && address && publicClient && tokenAddresses && amountRaw >= MIN_POSITION && !validation && !isWrongNetwork && step === 'idle');

  const accent = side === 'FOLLOW'
    ? { text: 'text-[#4FDBC8]', bg: 'bg-[#4FDBC8]', soft: 'bg-[#4FDBC8]/10', border: 'border-[#4FDBC8]/35' }
    : { text: 'text-[#F3A6C8]', bg: 'bg-[#F3A6C8]', soft: 'bg-[#F3A6C8]/10', border: 'border-[#F3A6C8]/35' };

  async function placePosition() {
    if (isWrongNetwork) {
      switchChain?.({ chainId: arcTestnet.id });
      return;
    }
    if (!canSubmit || !publicClient || !walletClient || !address || !tokenAddresses || !readyAddresses) {
      const message = validation ?? 'Connect wallet and enter an amount.';
      setError(message);
      toast.error(message);
      return;
    }

    try {
      setError(null);
      const [freshBalance, usdcAllowance] = await Promise.all([
        publicClient.readContract({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'balanceOf', args: [address] }),
        publicClient.readContract({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'allowance', args: [address, marketAddress] }),
      ]);
      if (freshBalance < amountRaw) throw new Error('Insufficient USDC balance for this position.');

      if (usdcAllowance < amountRaw) {
        setStep('approving-usdc');
        const approveHash = await walletClient.writeContract({
          account: address,
          chain: arcTestnet,
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [marketAddress, amountRaw],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (receipt.status !== 'success') throw new Error('USDC approval failed on-chain.');
      }

      setStep('minting');
      const mintHash = await walletClient.writeContract({
        account: address,
        chain: arcTestnet,
        address: marketAddress,
        abi: ARCSIGNAL_MARKET_V2_ABI,
        functionName: 'mintPositions',
        args: [amountRaw, address],
      });
      const mintReceipt = await publicClient.waitForTransactionReceipt({ hash: mintHash });
      if (mintReceipt.status !== 'success') throw new Error('Position mint failed on-chain.');

      const unwantedToken = side === 'FOLLOW' ? tokenAddresses.no : tokenAddresses.yes;
      const swapFunction = side === 'FOLLOW' ? 'swapExactNoForYes' : 'swapExactYesForNo';
      const outcomeAllowance = await publicClient.readContract({
        address: unwantedToken,
        abi: OUTCOME_TOKEN_V2_ABI,
        functionName: 'allowance',
        args: [address, ammAddress],
      });
      if (outcomeAllowance < amountRaw) {
        setStep('approving-outcome');
        const approveOutcomeHash = await walletClient.writeContract({
          account: address,
          chain: arcTestnet,
          address: unwantedToken,
          abi: OUTCOME_TOKEN_V2_ABI,
          functionName: 'approve',
          args: [ammAddress, amountRaw],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: approveOutcomeHash });
        if (receipt.status !== 'success') throw new Error('Outcome token approval failed on-chain.');
      }

      const liveQuote = await publicClient.readContract({
        address: ammAddress,
        abi: PREDICTION_MARKET_AMM_V2_ABI,
        functionName: 'quoteExactInput',
        args: [side !== 'FOLLOW', amountRaw],
      });
      const liveMinOut = liveQuote * (BPS - SLIPPAGE_BPS) / BPS;
      if (liveMinOut <= 0n) throw new Error('AMM liquidity is too thin for this position.');

      setStep('swapping');
      const swapHash = await walletClient.writeContract({
        account: address,
        chain: arcTestnet,
        address: ammAddress,
        abi: PREDICTION_MARKET_AMM_V2_ABI,
        functionName: swapFunction,
        args: [amountRaw, liveMinOut, address],
      });
      const swapReceipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });
      if (swapReceipt.status !== 'success') throw new Error('AMM swap failed on-chain.');

      setTxHash(swapHash);
      setStep('success');
      await refetchWalletUsdc();
      toast.success(`${side} position placed on Arc V2.`);
    } catch (err) {
      const message = friendlyError(err);
      setError(message);
      setStep('idle');
      toast.error(message);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="external-v2-position-title" className="max-h-[calc(100dvh-24px)] w-full max-w-xl overflow-hidden rounded-2xl border border-[#403947] bg-[#1C1B1B] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#403947]/70 p-5">
            <div>
              <div className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#DDB7FF]">External market · Arc V2 position</div>
              <h2 id="external-v2-position-title" className="mt-1 font-display text-xl font-bold text-[#F1EEF4]">Place a position</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-[#B0ABB5] hover:bg-white/5 hover:text-white" aria-label="Close position modal"><X size={20} /></button>
          </div>

          <div className="max-h-[calc(100dvh-150px)] overflow-y-auto p-5 space-y-4">
            <div className="rounded-xl border border-[#403947] bg-[#252229] p-4">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wide">
                <span className="rounded bg-[#DDB7FF]/10 px-2 py-1 font-bold text-[#DDB7FF]">{market.category}</span>
                <span className="rounded bg-[#C0C1FF]/10 px-2 py-1 font-bold text-[#C0C1FF]">{market.source}</span>
                <span className="rounded bg-[#4FDBC8]/10 px-2 py-1 font-bold text-[#4FDBC8]">Arc V2 mirrored</span>
              </div>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-[#F1EEF4]">{market.question}</p>
              <p className="mt-2 text-xs leading-relaxed text-[#B0ABB5]">This position is placed on the Arc V2 mirrored market. Final payout follows the Arc V2 oracle settlement, using the committed external source as evidence.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['FOLLOW', 'FADE'] as const).map((value) => (
                <button key={value} type="button" onClick={() => { setSide(value); setError(null); }} className={`min-h-[48px] rounded-xl border px-4 text-sm font-bold transition ${side === value ? `${value === 'FOLLOW' ? 'border-[#4FDBC8] bg-[#4FDBC8] text-[#131313]' : 'border-[#F3A6C8] bg-[#F3A6C8] text-[#240B35]'}` : 'border-[#403947] bg-[#252229] text-[#B0ABB5] hover:text-white'}`}>
                  {value}{value === suggestedSide ? ' · AI' : ''}
                </button>
              ))}
            </div>

            <div className={`rounded-xl border ${accent.border} ${accent.soft} p-4`}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#B0ABB5]">Selected side</span>
                <strong className={accent.text}>{side}</strong>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="rounded-lg border border-[#403947] bg-[#131313] p-3">
                  <span className="block text-[#B0ABB5] font-sans">YES reserve</span>
                  <strong className="text-[#F1EEF4]">{reserves ? formatUsdc(reserves.yes) : '…'}</strong>
                </div>
                <div className="rounded-lg border border-[#403947] bg-[#131313] p-3">
                  <span className="block text-[#B0ABB5] font-sans">NO reserve</span>
                  <strong className="text-[#F1EEF4]">{reserves ? formatUsdc(reserves.no) : '…'}</strong>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="external-position-amount" className="font-mono text-xs font-bold uppercase tracking-wider text-[#B0ABB5]">Amount</label>
              <div className="flex items-center rounded-xl border border-[#403947] bg-[#252229] p-3 focus-within:border-[#DDB7FF]">
                <div className="mr-3 flex items-center gap-1.5 rounded border border-[#403947] bg-[#1C1B1B] px-2.5 py-1 font-mono text-xs font-bold text-[#DDB7FF]"><DollarSign size={13} /> USDC</div>
                <input id="external-position-amount" value={amount} onChange={(event) => { setAmount(event.target.value); setError(null); }} type="number" min="0" step="0.01" placeholder="0.00" className="min-w-0 flex-1 bg-transparent font-mono text-2xl font-bold text-[#F1EEF4] outline-none placeholder:text-[#B0ABB5]/30" />
                <button type="button" onClick={() => setAmount(formatUnits(balance, 6))} className="rounded-lg border border-[#DDB7FF]/30 bg-[#DDB7FF]/10 px-3 py-2 font-mono text-xs font-bold text-[#DDB7FF] hover:bg-[#DDB7FF]/20">MAX</button>
              </div>
              <div className="flex items-center justify-between text-xs text-[#B0ABB5]">
                <span>Wallet: <strong className="text-[#F1EEF4]">{erc20Raw === null ? '…' : formatUsdc(balance)}</strong></span>
                <span>Slippage limit: 2.5%</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#403947] bg-[#252229] p-4 font-mono text-xs space-y-2">
              <div className="font-sans text-xs font-bold uppercase tracking-wider text-[#B0ABB5]">Position preview</div>
              <div className="flex justify-between gap-3"><span className="text-[#B0ABB5]">Collateral used</span><strong className="text-[#F1EEF4]">{formatUsdc(amountRaw)}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-[#B0ABB5]">Estimated extra {side === 'FOLLOW' ? 'YES' : 'NO'} from swap</span><strong className={accent.text}>{formatUsdc(quote)}</strong></div>
              <div className="flex justify-between gap-3 border-t border-[#403947]/70 pt-2"><span className="text-[#F1EEF4]">Estimated final {side === 'FOLLOW' ? 'YES' : 'NO'} exposure</span><strong className={accent.text}>{formatUsdc(finalExposure)}</strong></div>
              {minOut > 0n && <div className="flex justify-between gap-3"><span className="text-[#B0ABB5]">Minimum swap output</span><strong className="text-[#F1EEF4]">{formatUsdc(minOut)}</strong></div>}
            </div>

            {(validation || error) && (
              <div className="flex gap-2 rounded-xl border border-[#FFB4AB]/30 bg-[#FFB4AB]/10 p-3 text-sm text-[#FFB4AB]">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error ?? validation}</span>
              </div>
            )}

            {needsFunding && (
              <button type="button" onClick={() => { void loadFundUSDCModal().then(() => setFundingOpen(true)); }} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#DDB7FF]/30 bg-[#DDB7FF]/10 text-sm font-bold text-[#DDB7FF] hover:bg-[#DDB7FF]/20">
                Fund USDC on Arc <ArrowRight size={14} />
              </button>
            )}

            {txHash && (
              <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-[#4FDBC8]/30 bg-[#4FDBC8]/10 p-3 text-sm font-semibold text-[#4FDBC8] hover:bg-[#4FDBC8]/15">
                <CheckCircle2 size={16} /> Position confirmed · View transaction
              </a>
            )}
          </div>

          <div className="border-t border-[#403947]/70 bg-[#1C1B1B] p-5">
            <button type="button" onClick={() => void placePosition()} disabled={!canSubmit} className={`flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 font-mono text-xs font-bold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-45 ${accent.bg} text-[#131313]`}>
              {step !== 'idle' && step !== 'success' ? <Loader2 size={16} className="animate-spin" /> : null}
              {step === 'approving-usdc' ? 'Approving USDC...' : step === 'minting' ? 'Minting outcome tokens...' : step === 'approving-outcome' ? 'Approving swap...' : step === 'swapping' ? 'Swapping into position...' : step === 'success' ? 'Position placed' : isWrongNetwork ? 'Switch to Arc Testnet' : `Place ${side} position`}
            </button>
          </div>
        </div>
      </div>

      {fundingOpen && FundUSDCModal && (
        <FundUSDCModal
          isOpen
          onClose={() => setFundingOpen(false)}
          suggestedAmount={amount}
          onFunded={async () => {
            await refetchWalletUsdc();
          }}
        />
      )}
    </>
  );
}


