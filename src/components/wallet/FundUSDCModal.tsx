'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import type { EIP1193Provider } from 'viem';
import { formatCircleGasFee } from '@/lib/circle-fees';
import {
  bridgeUsdcToArc,
  canRetryCircleBridge,
  createBrowserWalletViemAdapter,
  estimateBridgeUsdc,
  retryBridgeUsdc,
  supportedFundingSourceChains,
  type BrowserWalletViemAdapter,
  type CircleBridgeResult,
  type CircleBridgeProgress,
  type FundingSourceChain,
} from '@/lib/circle-app-kit';

type FlowState =
  | 'idle'
  | 'estimating'
  | 'ready'
  | 'preparing'
  | 'signature'
  | 'bridging'
  | 'confirming'
  | 'complete'
  | 'error';

type FeeSummary = {
  protocol: string;
  gas: string;
};

const subscribeToClient = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export interface FundUSDCModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFunded?: () => void | Promise<void>;
  suggestedAmount?: string;
}

function friendlyCircleError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  const message = raw.toLowerCase();
  if (message.includes('user rejected') || message.includes('user denied')) {
    return 'You cancelled the wallet request. No funds were moved.';
  }
  if (message.includes('insufficient')) {
    return 'The source wallet needs enough USDC and source-chain gas to complete this bridge.';
  }
  if (message.includes('chain') || message.includes('network')) {
    return 'Your wallet could not switch to the required network. Add the source network and retry.';
  }
  return raw.split(/(?:Details:|Docs:|Version:)/i)[0].trim().slice(0, 180) ||
    'Circle App Kit could not complete the bridge. Please retry.';
}

function flowFromProgress(progress: CircleBridgeProgress): FlowState {
  const name = progress.name.toLowerCase();
  if (progress.state === 'error') return 'error';
  if (
    name.includes('attestation') ||
    name.includes('forward') ||
    name.includes('mint')
  ) return 'confirming';
  if (name.includes('burn')) return 'bridging';
  if (name.includes('approve')) return 'signature';
  return 'preparing';
}

function summarizeEstimate(estimate: Awaited<ReturnType<typeof estimateBridgeUsdc>>): FeeSummary {
  const protocol = estimate.fees
    .filter((fee) => fee.amount != null && Number(fee.amount) > 0)
    .map((fee) => `${fee.amount} ${fee.token}`)
    .join(' + ') || 'No protocol fee quoted';
  const gas = estimate.gasFees
    .map((fee) => {
      if (!fee.fees) return `${fee.name}: unavailable`;
      const nativeFee = formatCircleGasFee(fee.fees.fee);
      return nativeFee
        ? `${fee.name}: ~${nativeFee} ${fee.token}`
        : `${fee.name}: unavailable`;
    })
    .join(' · ') || 'Wallet will quote the network fee';
  return { protocol, gas };
}

export default function FundUSDCModal({
  isOpen,
  onClose,
  onFunded,
  suggestedAmount = '',
}: FundUSDCModalProps) {
  const { address, connector, isConnected } = useAccount();
  const [sourceChain, setSourceChain] = useState<FundingSourceChain>('Ethereum_Sepolia');
  const [amount, setAmount] = useState(suggestedAmount);
  const [flow, setFlow] = useState<FlowState>('idle');
  const [fees, setFees] = useState<FeeSummary | null>(null);
  const [steps, setSteps] = useState<CircleBridgeProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adapter, setAdapter] = useState<BrowserWalletViemAdapter | null>(null);
  const [failedResult, setFailedResult] = useState<CircleBridgeResult | null>(null);
  const canUseDOM = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot,
  );

  const numericAmount = Number(amount);
  const validAmount = Number.isFinite(numericAmount) && numericAmount > 0;
  const isBusy = ['estimating', 'preparing', 'signature', 'bridging', 'confirming'].includes(flow);
  const source = useMemo(
    () => supportedFundingSourceChains.find((chain) => chain.id === sourceChain),
    [sourceChain],
  );

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const getAdapter = async () => {
    if (!connector) throw new Error('Connect a browser wallet first.');
    const provider = await connector.getProvider();
    if (!provider) throw new Error('The connected wallet did not expose a signing provider.');
    const next = await createBrowserWalletViemAdapter(provider as EIP1193Provider);
    setAdapter(next);
    return next;
  };

  const updateProgress = (progress: CircleBridgeProgress) => {
    setFlow(flowFromProgress(progress));
    setSteps((current) => {
      const index = current.findIndex((step) => step.name === progress.name);
      if (index === -1) return [...current, progress];
      return current.map((step, stepIndex) => stepIndex === index ? progress : step);
    });
  };

  const handleEstimate = async () => {
    if (!validAmount) return;
    try {
      setError(null);
      setFlow('estimating');
      const walletAdapter = adapter ?? await getAdapter();
      const estimate = await estimateBridgeUsdc({
        adapter: walletAdapter,
        sourceChain,
        amount,
      });
      setFees(summarizeEstimate(estimate));
      setFlow('ready');
    } catch (estimateError) {
      setError(friendlyCircleError(estimateError));
      setFlow('error');
    }
  };

  const handleBridge = async () => {
    if (!validAmount) return;
    try {
      setError(null);
      setSteps([]);
      setFailedResult(null);
      setFlow('preparing');
      const walletAdapter = adapter ?? await getAdapter();
      const result = await bridgeUsdcToArc(
        { adapter: walletAdapter, sourceChain, amount },
        updateProgress,
      );
      setSteps(result.steps);
      if (result.state !== 'success') {
        const failed = result.steps.find((step) => step.state === 'error');
        setFailedResult(canRetryCircleBridge(result) ? result : null);
        setError(friendlyCircleError(failed?.errorMessage ?? 'The bridge did not complete.'));
        setFlow('error');
        return;
      }
      setFlow('complete');
      await onFunded?.();
    } catch (bridgeError) {
      setError(friendlyCircleError(bridgeError));
      setFlow('error');
    }
  };

  const handleRetryBridge = async () => {
    if (!failedResult || !adapter) return;
    try {
      setError(null);
      setFlow('preparing');
      const result = await retryBridgeUsdc(failedResult, adapter, updateProgress);
      setSteps(result.steps);
      if (result.state !== 'success') {
        const failed = result.steps.find((step) => step.state === 'error');
        setFailedResult(canRetryCircleBridge(result) ? result : null);
        setError(friendlyCircleError(failed?.errorMessage ?? 'The bridge retry did not complete.'));
        setFlow('error');
        return;
      }
      setFailedResult(null);
      setFlow('complete');
      await onFunded?.();
    } catch (retryError) {
      setError(friendlyCircleError(retryError));
      setFlow('error');
    }
  };

  const resetReview = useCallback(() => {
    setFlow('idle');
    setFees(null);
    setSteps([]);
    setError(null);
    setFailedResult(null);
  }, []);

  const handleClose = useCallback(() => {
    resetReview();
    onClose();
  }, [onClose, resetReview]);

  useEffect(() => {
    if (!isOpen || isBusy) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isBusy, isOpen]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (isBusy || flow === 'complete') return;
    if (flow === 'ready') {
      void handleBridge();
      return;
    }
    if (flow === 'error' && failedResult) {
      void handleRetryBridge();
      return;
    }
    void handleEstimate();
  };

  const timeline = [
    { key: 'preparing', label: 'Preparing route' },
    { key: 'signature', label: 'Wallet signatures' },
    { key: 'bridging', label: 'Burning source USDC' },
    { key: 'confirming', label: 'Circle forwarding to Arc' },
    { key: 'complete', label: 'Funds available' },
  ] as const;

  if (!isOpen || !canUseDOM) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050506]/90 p-4 backdrop-blur-lg"
      onMouseDown={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget && !isBusy) handleClose();
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fund-usdc-title"
        aria-describedby="fund-usdc-description"
        aria-busy={isBusy}
        className="relative flex max-h-[92vh] w-full max-w-[34rem] flex-col overflow-hidden rounded-[1.35rem] border border-[#ddb7ff]/20 bg-[#121214] shadow-[0_32px_100px_rgba(0,0,0,0.82),0_0_80px_rgba(194,132,252,0.06)]"
      >
        <div className="h-px bg-gradient-to-r from-transparent via-[#ddb7ff]/90 to-transparent" />
        <div className="flex items-start justify-between border-b border-white/10 p-5">
          <div>
            <div className="flex items-center gap-2.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ddb7ff]">Arc settlement route</p>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#94a3b8]">Testnet</span>
            </div>
            <h2 id="fund-usdc-title" className="mt-2 text-xl font-semibold tracking-[-0.02em] text-white">Fund your Arc wallet</h2>
            <p id="fund-usdc-description" className="mt-1 text-sm text-[#94a3b8]">Move USDC to Arc through Circle&apos;s native infrastructure.</p>
          </div>
          <button type="button" aria-label="Close funding modal" disabled={isBusy} onClick={handleClose} className="rounded-full border border-transparent p-2 text-[#94a3b8] transition hover:border-white/10 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff]/70 disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {!isConnected || !address ? (
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">
              Connect a wallet before choosing a funding route.
            </div>
          ) : (
            <>
              <label htmlFor="circle-source-chain" className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-[#94a3b8]">From</label>
              <select id="circle-source-chain" autoFocus value={sourceChain} disabled={isBusy || flow === 'complete'} onChange={(event) => { setSourceChain(event.target.value as FundingSourceChain); resetReview(); }} className="w-full rounded-xl border border-white/10 bg-[#1b1b1e] px-4 py-3 text-sm text-white outline-none transition focus:border-[#ddb7ff]/60 focus:ring-2 focus:ring-[#ddb7ff]/10">
                {supportedFundingSourceChains.map((chain) => <option key={chain.id} value={chain.id}>{chain.name}</option>)}
              </select>

              <div className="flex justify-center py-3 text-[#ddb7ff]"><ArrowDown size={18} /></div>

              <div className="rounded-xl border border-[#ddb7ff]/20 bg-gradient-to-br from-[#ddb7ff]/[0.08] to-transparent p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[#94a3b8]">To</p>
                    <p className="mt-1 font-semibold text-white">Arc Testnet</p>
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 font-mono text-[10px] text-emerald-300">5042002</span>
                </div>
                <p className="mt-3 truncate font-mono text-xs text-[#94a3b8]">{address}</p>
              </div>

              <label htmlFor="circle-bridge-amount" className="mb-2 mt-5 block font-mono text-[10px] uppercase tracking-wider text-[#94a3b8]">Amount</label>
              <div className="flex items-center rounded-xl border border-white/10 bg-[#1b1b1e] px-4 transition focus-within:border-[#ddb7ff]/60 focus-within:ring-2 focus-within:ring-[#ddb7ff]/10">
                <input id="circle-bridge-amount" inputMode="decimal" value={amount} disabled={isBusy || flow === 'complete'} onChange={(event) => { setAmount(event.target.value); resetReview(); }} placeholder="0.00" className="min-w-0 flex-1 bg-transparent py-3 text-lg font-semibold text-white outline-none" />
                <span className="font-mono text-xs font-bold text-[#ddb7ff]">USDC</span>
              </div>
              <p className="mt-2 text-xs text-[#64748b]">Your wallet signs approval and burning on {source?.name}. Circle forwards the mint to Arc, so you do not need an existing Arc gas balance.</p>

              {fees && (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs">
                  <div className="flex justify-between gap-4"><span className="text-[#94a3b8]">Protocol fee</span><span className="text-right text-white">{fees.protocol}</span></div>
                  <div className="mt-2 flex justify-between gap-4"><span className="text-[#94a3b8]">Network fee</span><span className="text-right text-white">{fees.gas}</span></div>
                  <p className="mt-2 text-[10px] text-[#64748b]">Arc destination fees are paid in native USDC.</p>
                </div>
              )}

              {(isBusy || flow === 'complete' || steps.length > 0) && (
                <div aria-live="polite" className="mt-5 space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
                  {timeline.map((item, index) => {
                    const currentOrder = timeline.findIndex((entry) => entry.key === flow);
                    const done = flow === 'complete' || index < currentOrder;
                    const active = item.key === flow;
                    return (
                      <div key={item.key} className="flex items-center gap-3 text-sm">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${done ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : active ? 'border-[#ddb7ff]/50 bg-[#ddb7ff]/10 text-[#ddb7ff]' : 'border-white/10 text-[#64748b]'}`}>
                          {done ? <Check size={13} /> : active ? <Loader2 size={13} className="animate-spin" /> : index + 1}
                        </span>
                        <span className={done || active ? 'text-white' : 'text-[#64748b]'}>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {steps.some((step) => step.explorerUrl) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {steps.filter((step) => step.explorerUrl).map((step) => (
                    <a key={`${step.name}-${step.txHash}`} href={step.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs text-[#ddb7ff] hover:bg-white/5">
                      {step.name} <ExternalLink size={11} />
                    </a>
                  ))}
                </div>
              )}

              {error && (
                <div role="alert" className="mt-4 flex gap-3 rounded-xl border border-[#ddb7ff]/25 bg-[#ddb7ff]/[0.07] p-4 text-sm text-[#ead7ff]">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" /><span>{error}</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-white/10 p-5">
          {flow === 'complete' ? (
            <button type="button" onClick={handleClose} className="w-full rounded-xl bg-[#ddb7ff] py-3.5 text-sm font-bold text-[#121212] transition hover:bg-[#ead7ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121214]">Done</button>
          ) : flow === 'ready' ? (
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ddb7ff] py-3.5 text-sm font-bold text-[#121212] transition hover:bg-[#ead7ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121214]">Bridge {amount} USDC to Arc <ArrowRight size={15} /></button>
          ) : flow === 'error' ? (
            <button type="submit" disabled={!validAmount || !isConnected} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ddb7ff] py-3.5 text-sm font-bold text-[#121212] transition hover:bg-[#ead7ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121214] disabled:cursor-not-allowed disabled:opacity-40"><RefreshCw size={15} /> {failedResult ? 'Retry bridge' : 'Retry estimate'}</button>
          ) : (
            <button type="submit" disabled={!validAmount || !isConnected || isBusy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ddb7ff] py-3.5 text-sm font-bold text-[#121212] transition hover:bg-[#ead7ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121214] disabled:cursor-not-allowed disabled:opacity-40">
              {flow === 'estimating' ? <><Loader2 size={15} className="animate-spin" /> Estimating route...</> : 'Review bridge'}
            </button>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-[#64748b]">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={12} /> Circle CCTP settlement</span>
            <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 transition hover:text-[#ddb7ff]">Get testnet USDC <ExternalLink size={11} /></a>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}
