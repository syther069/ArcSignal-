'use client';

import React, { useEffect, useState } from 'react';
import { useAccount, useWalletClient, usePublicClient, useReadContract } from 'wagmi';
import { parseUnits, formatUnits, formatEther } from 'viem';
import { Market, StakeSide } from '@/types';
import { USDC_ADDRESS, USDC_ABI } from '@/lib/usdc';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import { clearMarketCache } from '@/lib/markets';
import { useWallet } from '@/hooks/useWallet';
import toast from 'react-hot-toast';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Zap,
  Info,
  DollarSign,
  ArrowRight,
} from 'lucide-react';

function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (lower.includes('user rejected') || lower.includes('user denied') || lower.includes('rejected the request'))
    return 'Transaction cancelled — you rejected the request in your wallet.';
  if (lower.includes('insufficient funds') || lower.includes('exceeds the balance'))
    return 'Insufficient ARC for gas fees. Please top up your wallet.';
  if (lower.includes('insufficient usdc') || lower.includes('insufficient balance'))
    return 'Insufficient USDC balance for this stake.';
  if (lower.includes('allowance') || lower.includes('approve first'))
    return 'USDC allowance too low. Please approve first.';
  if (lower.includes('market expired') || lower.includes('market already resolved'))
    return 'This market has closed and is no longer accepting stakes.';
  if (lower.includes('market does not exist'))
    return 'Market not found on-chain. It may have been removed.';
  if (lower.includes('reverted') || lower.includes('execution reverted'))
    return 'Transaction reverted on-chain. The market may be closed or conditions changed.';
  if (lower.includes('nonce'))
    return 'Transaction conflict — please wait a moment and try again.';
  if (lower.includes('timeout') || lower.includes('timed out'))
    return 'Network request timed out. Please check your connection and retry.';
  if (lower.includes('network') || lower.includes('disconnected') || lower.includes('failed to fetch'))
    return 'Network error — please check your connection and try again.';
  if (lower.includes('429') || lower.includes('rate limit'))
    return 'Too many requests. Please wait a few seconds and retry.';
  if (lower.includes('chain mismatch') || lower.includes('wrong network'))
    return 'Wrong network — please switch to ARC Testnet in your wallet.';

  const firstSentence = raw.split(/(?:Details:|Docs:|Contract Call:|Request Arguments:|Version:)/i)[0].trim();
  if (firstSentence.length > 120) return firstSentence.slice(0, 117) + '…';
  return firstSentence || 'Something went wrong. Please try again.';
}

export interface StakeModalProps {
  market: Market;
  side: StakeSide;
  isOpen: boolean;
  onClose: () => void;
}

export function StakeModal({ market, side, isOpen, onClose }: StakeModalProps) {
  const [amount, setAmount] = useState('');
  const [selectedSide, setSelectedSide] = useState<StakeSide>(side);
  const [step, setStep] = useState<'idle' | 'review' | 'approving' | 'staking' | 'confirming' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [estimatedGas, setEstimatedGas] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setSelectedSide(side);
  }, [isOpen, side]);

  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { isWrongNetwork, switchChain } = useWallet();

  const { data: usdcRaw } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, staleTime: 10_000 },
  });
  const usdcBalanceBigInt = (usdcRaw as bigint | undefined) ?? 0n;
  const usdcBalanceFormatted = formatUnits(usdcBalanceBigInt, 6);

  const { data: usdcAllowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, ARCSIGNAL_ADDRESS] : undefined,
    query: { enabled: !!address, staleTime: 10_000 },
  });
  const currentAllowance = (usdcAllowanceRaw as bigint | undefined) ?? 0n;

  const parsedAmount = Math.max(parseFloat(amount) || 0, 0);
  const amountStr = isNaN(parsedAmount) ? '0' : parsedAmount.toString();
  const amountBigInt = parseUnits(amountStr, 6);

  if (!isOpen) return null;

  const isFollow = selectedSide === 0;

  // Violet theme for Follow AI (ArcSignal Brand Color), Coral/Rose for Fade AI
  const accent = isFollow
    ? {
        label: 'Follow AI',
        dot: 'bg-[#ddb7ff]',
        text: 'text-[#ddb7ff]',
        badgeBg: 'bg-[#ddb7ff]/10',
        badgeBorder: 'border-[#ddb7ff]/30',
        border: 'border-[#b76dff]/35',
        bg: 'bg-[#b76dff]/10',
        focus: 'focus-within:border-[#ddb7ff]',
        ring: 'shadow-[0_0_35px_rgba(221,183,255,0.18)]',
        btnActive: 'bg-gradient-to-r from-[#b76dff] to-[#ddb7ff] text-[#121212]',
        pillActive: 'bg-[#ddb7ff] text-[#121212]',
      }
    : {
        label: 'Fade AI',
        dot: 'bg-[#fb7185]',
        text: 'text-[#fda4af]',
        badgeBg: 'bg-[#fb7185]/10',
        badgeBorder: 'border-[#fb7185]/30',
        border: 'border-[#fb7185]/35',
        bg: 'bg-[#fb7185]/10',
        focus: 'focus-within:border-[#fb7185]',
        ring: 'shadow-[0_0_35px_rgba(251,113,133,0.18)]',
        btnActive: 'bg-gradient-to-r from-[#f43f5e] to-[#fb7185] text-white',
        pillActive: 'bg-[#fb7185] text-[#121212]',
      };

  const followProbability = Math.min(Math.max(market.probability ?? market.confidence ?? 50, 1), 99);
  const fadeProbability = 100 - followProbability;
  const impliedProbability = isFollow ? followProbability : fadeProbability;
  const entryPriceCents = impliedProbability;
  const payoutMultiplier = 100 / impliedProbability;
  const platformFeeRate = 0.005; // 0.5% Protocol Fee
  const platformFee = parsedAmount * platformFeeRate;
  const netStake = Math.max(parsedAmount - platformFee, 0);
  const estimatedWin = netStake * payoutMultiplier;
  const profit = estimatedWin - parsedAmount;
  
  const nowSeconds = Math.floor(Date.now() / 1000);
  const closesInSeconds = Math.max(market.resolutionTime - nowSeconds, 0);
  const closeHours = Math.floor(closesInSeconds / 3600);
  const closeMinutes = Math.floor((closesInSeconds % 3600) / 60);
  const closesLabel = closesInSeconds > 0 ? `${closeHours}h ${closeMinutes}m` : 'closed';
  
  const marketClosed =
    market.resolved ||
    market.status === 'CLOSED' ||
    market.status === 'PENDING_RESOLUTION' ||
    market.status === 'RESOLVED' ||
    market.status === 'VOIDED' ||
    closesInSeconds <= 0;
    
  const minStake = 1;
  const hasAmount = parsedAmount > 0;
  const belowMinimum = hasAmount && parsedAmount < minStake;
  const insufficientBalance = hasAmount && amountBigInt > usdcBalanceBigInt;
  
  const validationMessage = marketClosed
    ? 'This market has closed. Trading is disabled.'
    : belowMinimum
      ? `Minimum stake: ${minStake.toFixed(2)} USDC`
      : insufficientBalance
        ? `Insufficient balance. You have ${Number(usdcBalanceFormatted).toFixed(2)} USDC.`
        : null;
        
  const canContinue = step === 'idle' && hasAmount && !validationMessage && !isWrongNetwork;
  const ctaLabel = !hasAmount
    ? 'Enter an amount'
    : marketClosed
      ? 'Market closed'
      : belowMinimum
        ? 'Minimum 1.00 USDC'
        : insufficientBalance
          ? 'Insufficient USDC Balance'
          : 'Review Position';

  const newFollowPool = isFollow ? market.followPool + parsedAmount : market.followPool;
  const newFadePool   = !isFollow ? market.fadePool + parsedAmount : market.fadePool;
  const winningPool   = isFollow ? newFollowPool : newFadePool;
  const poolShare     = winningPool > 0 ? (netStake / winningPool) * 100 : 0;

  const handleQuickAdd = (addAmount: number) => {
    const current = parseFloat(amount) || 0;
    const nextVal = (current + addAmount).toFixed(2);
    setAmount(nextVal);
    setError(null);
  };

  const handleApprove = async () => {
    if (isWrongNetwork) {
      toast.error('Switch to Arc Testnet before approving USDC.');
      return;
    }
    if (validationMessage || !hasAmount) {
      const message = validationMessage ?? 'Enter an amount';
      toast.error(message);
      setError(message);
      return;
    }
    if (!walletClient || !address || !publicClient) return;
    try {
      setError(null);
      setStep('approving');
      const approveHash = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [ARCSIGNAL_ADDRESS, amountBigInt],
      });
      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
      if (approveReceipt.status === 'reverted') {
        throw new Error('USDC approval transaction failed on-chain.');
      }
      await refetchAllowance();
      toast.success('USDC approved successfully!');
      setStep('idle');
    } catch (err: any) {
      console.error('[StakeModal] Approval error:', err);
      const message = friendlyError(err);
      toast.error(message);
      setError(message);
      setStep('idle');
    }
  };

  const handleStake = async () => {
    if (isWrongNetwork) {
      toast.error('Switch to Arc Testnet before placing a position.');
      return;
    }
    if (validationMessage || !hasAmount) {
      const message = validationMessage ?? 'Enter an amount';
      toast.error(message);
      setError(message);
      return;
    }
    if (!walletClient || !address || !publicClient) return;
    try {
      setError(null);

      if (!USDC_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(USDC_ADDRESS)) {
        throw new Error('USDC contract address is not configured. Check NEXT_PUBLIC_USDC_CONTRACT_ADDRESS.');
      }
      if (!ARCSIGNAL_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(ARCSIGNAL_ADDRESS)) {
        throw new Error('ArcSignal contract address is not configured.');
      }

      if (usdcBalanceBigInt < amountBigInt) {
        throw new Error(`Insufficient USDC balance. You have ${formatUnits(usdcBalanceBigInt, 6)} USDC but need ${amount} USDC.`);
      }

      if (currentAllowance < amountBigInt) {
        throw new Error('Insufficient USDC allowance. Please approve first.');
      }

      setStep('staking');
      const { request } = await publicClient.simulateContract({
        account: address,
        address: ARCSIGNAL_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'stake',
        args: [market.marketId, selectedSide, amountBigInt],
      });

      const gas = await publicClient.estimateContractGas({
        account: address,
        address: ARCSIGNAL_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'stake',
        args: [market.marketId, selectedSide, amountBigInt],
      });
      const gasPrice = await publicClient.getGasPrice();
      setEstimatedGas(formatEther(gas * gasPrice));

      const stakeHash = await walletClient.writeContract(request);
      setStep('confirming');

      const stakeReceipt = await publicClient.waitForTransactionReceipt({ hash: stakeHash });
      if (stakeReceipt.status === 'reverted') {
        throw new Error('Stake transaction failed on-chain. The market may be closed or you may have insufficient USDC.');
      }

      const voteResponse = await fetch(`/api/markets/${market.marketId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: selectedSide === 0 ? 'follow' : 'fade',
          amount: amountStr,
          walletAddress: address,
          txHash: stakeHash,
        }),
      });

      // Keep the confirmed transaction available to PortfolioClient for an
      // immediate receipt-based read while the database index catches up.
      try {
        const pending = JSON.parse(localStorage.getItem('arcsignal:portfolio:pending-stakes') ?? '[]') as Array<Record<string, string>>;
        const next = [
          ...pending.filter((item) => item.txHash !== stakeHash),
          { address: address.toLowerCase(), marketId: market.marketId, txHash: stakeHash, createdAt: String(Date.now()) },
        ].slice(-5);
        localStorage.setItem('arcsignal:portfolio:pending-stakes', JSON.stringify(next));
      } catch {
        // Local storage is an optimization; the on-chain transaction remains authoritative.
      }

      if (!voteResponse.ok) {
        console.warn('Immediate portfolio indexing response was not successful:', await voteResponse.text());
      }

      clearMarketCache();
      setTxHash(stakeHash);
      setEstimatedGas(null);
      toast.success(`Successfully placed ${selectedSide === 0 ? 'FOLLOW' : 'FADE'} position for ${amountStr} USDC!`);
      setStep('success');
    } catch (err: any) {
      console.error('[StakeModal] Stake error:', err);
      const message = friendlyError(err);
      toast.error(message);
      setError(message);
      setStep('idle');
    }
  };

  const handleClose = () => {
    if (step === 'approving' || step === 'staking' || step === 'confirming') return;
    setTimeout(() => {
      setAmount('');
      setError(null);
      setTxHash(null);
      setEstimatedGas(null);
      setStep('idle');
    }, 300);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      {/* Modal Card */}
      <div className="bg-[#141414] border border-white/[0.1] shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(183,109,255,0.08)] w-full max-w-md rounded-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Violet Brand Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ddb7ff] to-transparent" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex justify-between items-center bg-[#171717]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ddb7ff] animate-pulse" />
            <span className="font-mono text-[11px] font-bold text-[#ddb7ff] tracking-[0.08em] uppercase">
              ArcSignal Trading
            </span>
          </div>
          <button
            onClick={handleClose}
            disabled={step === 'approving' || step === 'staking' || step === 'confirming'}
            className="rounded-full p-1.5 text-[#94a3b8] hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto custom-scrollbar flex-1">
          
          {step === 'success' && txHash ? (
            /* ── SUCCESS CONFIRMATION STATE ── */
            <div className="p-8 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#ddb7ff]/15 border border-[#ddb7ff]/40 flex items-center justify-center mb-1 shadow-[0_0_30px_rgba(221,183,255,0.2)]">
                <CheckCircle2 size={32} className="text-[#ddb7ff]" />
              </div>
              
              <h3 className="font-display text-2xl font-bold text-white tracking-tight">
                Position Confirmed
              </h3>
              
              <p className="font-sans text-xs text-[#cbd5e1] max-w-xs leading-relaxed">
                Your <strong className={isFollow ? 'text-[#ddb7ff]' : 'text-[#fda4af]'}>{isFollow ? 'FOLLOW AI' : 'FADE AI'}</strong> position of <strong className="font-mono text-white">{amountStr} USDC</strong> has been executed on-chain.
              </p>

              <div className="bg-[#1c1b1b] w-full p-4 rounded-xl mt-2 border border-white/[0.08] flex flex-col gap-1.5 text-left font-mono">
                <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider">
                  Transaction Hash
                </span>
                <a
                  href={`https://testnet.arcscan.app/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#ddb7ff] text-xs break-all hover:underline"
                >
                  {txHash}
                </a>
              </div>

              <button
                onClick={handleClose}
                className="w-full mt-3 bg-[#ddb7ff] hover:bg-[#ead7ff] text-[#121212] font-bold py-3.5 rounded-xl transition-colors font-mono text-xs tracking-wider uppercase shadow-lg"
              >
                Done & View Position
              </button>
            </div>

          ) : step === 'review' ? (
            /* ── REVIEW / SIGNING CONFIRMATION STATE ── */
            <div className="p-6 space-y-5">
              <div>
                <p className={`font-mono text-[10px] font-bold ${accent.text} uppercase tracking-widest mb-1`}>
                  Review Position
                </p>
                <h3 className="font-display text-xl font-bold text-white tracking-tight leading-snug">
                  Confirm Parameters Before Signing
                </h3>
                <p className="font-sans text-xs text-[#94a3b8] mt-1 leading-relaxed">
                  Verify the market side, amount, and projected payout.
                </p>
              </div>

              {/* Review Specs Card */}
              <div className="rounded-xl border border-white/[0.08] bg-[#181818] p-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-[#94a3b8] font-sans">Market</span>
                  <span className="text-white text-right max-w-[220px] truncate font-display font-semibold">
                    {(market as any).question || (market as any).title || 'Prediction Market'}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#94a3b8] font-sans">Direction</span>
                  <span className={`${accent.text} font-bold`}>{accent.label}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#94a3b8] font-sans">Entry Price / Multiplier</span>
                  <span className="text-white tabular-nums">{entryPriceCents.toFixed(0)}c · {payoutMultiplier.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#94a3b8] font-sans">Your Stake</span>
                  <span className="text-white font-bold tabular-nums">{amountStr} USDC</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#94a3b8] font-sans">Protocol Fee (0.5%)</span>
                  <span className="text-[#94a3b8] tabular-nums">-{platformFee.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#94a3b8] font-sans">Estimated Pool Share</span>
                  <span className="text-white tabular-nums">{poolShare.toFixed(2)}%</span>
                </div>
                <div className="h-px bg-white/[0.06] w-full" />
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-[#94a3b8] font-sans font-medium">Estimated Win</span>
                  <span className={`${accent.text} font-bold tabular-nums`}>~{estimatedWin.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#94a3b8] font-sans">Net Profit</span>
                  <span className={`font-bold tabular-nums ${isFollow ? 'text-[#ddb7ff]' : 'text-[#fda4af]'}`}>
                    {profit >= 0 ? '+' : ''}{profit.toFixed(2)} USDC
                  </span>
                </div>
              </div>

              <p className="font-sans text-[11px] text-[#64748b] leading-relaxed">
                Payouts are non-custodial estimates calculated from current pool shares. Final payout is determined upon oracle settlement.
              </p>

              {isWrongNetwork && (
                <button
                  onClick={() => switchChain({ chainId: 5042002 })}
                  className="w-full min-h-[44px] rounded-xl border border-amber-500/50 bg-amber-500/10 text-amber-300 text-xs font-semibold font-sans"
                >
                  Switch to Arc Testnet
                </button>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 font-sans">
                <button
                  onClick={() => setStep('idle')}
                  className="min-h-[46px] rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#cbd5e1] hover:text-white text-xs font-semibold transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleStake}
                  disabled={isWrongNetwork || !hasAmount || !!validationMessage}
                  className="min-h-[46px] rounded-xl bg-[#ddb7ff] hover:bg-[#ead7ff] text-[#121212] text-xs font-bold transition-all disabled:opacity-50 shadow-lg"
                >
                  Confirm & Sign
                </button>
              </div>
            </div>

          ) : (
            /* ── MAIN INPUT & SPECIFICATION STATE ── */
            <div className="p-6 space-y-5">
              
              {/* Question Summary & Closes Status */}
              <div>
                <h3 className="font-display text-sm sm:text-[15px] font-bold text-white mb-1.5 leading-snug">
                  {(market as any).question || (market as any).title || 'Prediction Market'}
                </h3>
                <div className="flex items-center gap-2 font-mono text-[11px] text-[#94a3b8]">
                  <span className="text-[#ddb7ff] font-semibold">Follow {followProbability.toFixed(0)}%</span>
                  <span>·</span>
                  <span className="text-[#fda4af] font-semibold">Fade {fadeProbability.toFixed(0)}%</span>
                  <span>·</span>
                  <span className="tabular-nums">Closes {closesLabel}</span>
                </div>
              </div>

              {/* Follow / Fade Direction Dual Selector Tabs */}
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#0c0c0c] p-1.5 border border-white/[0.08]">
                {/* Follow AI (Violet) */}
                <button
                  type="button"
                  onClick={() => setSelectedSide(0)}
                  className={`min-h-[42px] rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    isFollow
                      ? 'bg-[#ddb7ff] text-[#121212] shadow-md'
                      : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Sparkles size={14} className={isFollow ? 'text-[#121212]' : 'text-[#ddb7ff]'} />
                  <span>Follow AI</span>
                  <span className="opacity-80 tabular-nums">({followProbability.toFixed(0)}%)</span>
                </button>

                {/* Fade AI (Coral) */}
                <button
                  type="button"
                  onClick={() => setSelectedSide(1)}
                  className={`min-h-[42px] rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    !isFollow
                      ? 'bg-[#fb7185] text-[#121212] shadow-md'
                      : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <X size={14} className={!isFollow ? 'text-[#121212]' : 'text-[#fb7185]'} />
                  <span>Fade AI</span>
                  <span className="opacity-80 tabular-nums">({fadeProbability.toFixed(0)}%)</span>
                </button>
              </div>

              {/* Live Direction Spec Indicator */}
              <div className="flex items-center justify-between text-xs font-sans px-1">
                <span className="inline-flex items-center gap-2 text-white font-medium">
                  <span className={`h-2 w-2 rounded-full ${accent.dot} animate-pulse`} />
                  Selected Direction: <strong className={accent.text}>{accent.label}</strong>
                </span>
                <span className="font-mono text-[10px] text-[#94a3b8] uppercase tracking-wider">
                  {market.category === 'football' ? `${market.homeTeam} vs ${market.awayTeam}` : market.subType || market.category}
                </span>
              </div>

              {/* Entry Odds Specifications Box */}
              <div className={`rounded-xl border ${accent.border} ${accent.bg} ${accent.ring} p-4 space-y-2.5 transition-all`}>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[10px] uppercase tracking-widest text-[#94a3b8] font-bold">
                    Entry Odds & Conviction
                  </span>
                  <span className={`text-xs font-bold ${accent.text} tabular-nums`}>
                    {accent.label} @ {entryPriceCents.toFixed(0)}c
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <div className="text-2xl font-bold font-mono text-white tabular-nums tracking-tight">
                      {payoutMultiplier.toFixed(2)}x
                    </div>
                    <div className="text-[11px] text-[#94a3b8] font-sans">Potential payout multiplier</div>
                  </div>
                  
                  <div className="text-right text-xs font-mono text-[#94a3b8] space-y-0.5">
                    <div>Implied Odds: <strong className="text-white">{impliedProbability.toFixed(0)}%</strong></div>
                    <div className="text-[10px] opacity-70">Formula: Stake × (100 / {impliedProbability.toFixed(0)})</div>
                  </div>
                </div>
              </div>

              {/* Amount to Stake Input Box */}
              <div className="space-y-2 font-sans">
                <div className="flex justify-between items-end">
                  <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                    Amount to Stake
                  </label>
                  <div className="text-right font-mono text-[11px]">
                    <span className="text-[#94a3b8]">
                      Balance:{' '}
                      <strong className="text-white tabular-nums">
                        {Number(usdcBalanceFormatted).toFixed(2)}
                      </strong>{' '}
                      USDC
                    </span>
                  </div>
                </div>

                {/* Input Field with Violet Focus */}
                <div className={`relative flex items-center bg-[#0d0d0d] border-2 border-white/[0.1] ${accent.focus} rounded-xl p-4 transition-all`}>
                  <div className="flex items-center gap-1.5 mr-3 px-2 py-1 rounded bg-white/[0.06] font-mono text-xs font-bold text-[#ddb7ff]">
                    <DollarSign size={13} className="text-[#ddb7ff]" />
                    <span>USDC</span>
                  </div>
                  
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError(null);
                    }}
                    className="w-full min-w-0 bg-transparent outline-none text-2xl sm:text-3xl font-mono font-bold text-white placeholder:text-white/20 tabular-nums"
                    placeholder="0.00"
                  />
                  
                  <button
                    type="button"
                    onClick={() => setAmount(usdcBalanceFormatted)}
                    className="px-2.5 py-1 rounded-lg bg-[#ddb7ff]/15 hover:bg-[#ddb7ff]/25 border border-[#ddb7ff]/30 text-[#ddb7ff] font-mono text-xs font-bold transition-colors shrink-0"
                  >
                    MAX
                  </button>
                </div>

                {/* Quick Add Presets */}
                <div className="flex items-center gap-1.5 pt-1 font-mono text-xs">
                  {[10, 25, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleQuickAdd(preset)}
                      className="flex-1 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[#cbd5e1] hover:text-white text-[11px] font-semibold transition-colors"
                    >
                      +${preset}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="text-[#94a3b8] font-mono text-[11px]">≈ ${parsedAmount.toFixed(2)} USD</span>
                  {validationMessage && !marketClosed && (
                    <span className="text-[#fda4af] font-mono text-[11px] font-medium text-right">
                      {validationMessage}
                    </span>
                  )}
                </div>
              </div>

              {/* Payout Breakdown Specifications */}
              <div className="rounded-xl border border-white/[0.06] bg-[#161616] p-4 space-y-2.5 font-mono text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1">
                  Payout Breakdown Specifications
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-[#94a3b8] font-sans">Your Stake</span>
                  <span className="text-white font-semibold tabular-nums">{parsedAmount.toFixed(2)} USDC</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#94a3b8] font-sans">Platform Protocol Fee (0.5%)</span>
                  <span className="text-[#94a3b8] tabular-nums">-{platformFee.toFixed(2)} USDC</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#94a3b8] font-sans">Estimated Pool Share</span>
                  <span className="text-white tabular-nums">{poolShare.toFixed(2)}%</span>
                </div>

                <div className="h-px bg-white/[0.06] w-full" />

                <div className="flex justify-between items-center">
                  <span className="text-white font-sans font-medium">Potential Payout (If Win)</span>
                  <span className={`${accent.text} font-bold text-sm tabular-nums`}>
                    {estimatedWin.toFixed(2)} USDC
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#94a3b8] font-sans">Estimated Net Profit</span>
                  <span className={`font-bold tabular-nums ${isFollow ? 'text-[#ddb7ff]' : 'text-[#fda4af]'}`}>
                    {profit >= 0 ? '+' : ''}{profit.toFixed(2)} USDC
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-[#fb7185]/10 border border-[#fb7185]/30 rounded-xl text-[#fda4af] text-xs font-mono flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Market Details Dropdown */}
              <details className="group rounded-xl border border-white/[0.06] bg-[#101010] p-3 text-xs font-mono">
                <summary className="cursor-pointer list-none text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] flex items-center justify-between">
                  <span>Smart Contract & Protocol Specs</span>
                  <ChevronRight size={12} className="transition-transform group-open:rotate-90 text-[#94a3b8]" />
                </summary>
                <div className="mt-3 space-y-2 text-[10px] text-[#94a3b8] border-t border-white/[0.04] pt-2">
                  <div className="flex justify-between gap-3">
                    <span>Contract</span>
                    <span className="text-white truncate max-w-[190px]">{ARCSIGNAL_ADDRESS}</span>
                  </div>
                  {estimatedGas && (
                    <div className="flex justify-between gap-3">
                      <span>Est. Gas</span>
                      <span className="text-white tabular-nums">~{Number(estimatedGas).toFixed(6)} ARC</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <span>Market ID</span>
                    <span className="text-white truncate max-w-[190px]">{market.marketId}</span>
                  </div>
                </div>
              </details>

            </div>
          )}

        </div>

        {/* Modal Footer CTA */}
        {step !== 'success' && step !== 'review' && (
          <div className="p-6 pt-2 border-t border-white/[0.06] bg-[#171717]">
            {currentAllowance < amountBigInt ? (
              <button
                onClick={handleApprove}
                disabled={!canContinue}
                className="w-full bg-[#ddb7ff] hover:bg-[#ead7ff] text-[#121212] font-mono text-xs font-bold py-4 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                {step === 'approving' ? (
                  <>
                    <span className="animate-spin text-sm leading-none">↻</span>
                    <span>Approving USDC...</span>
                  </>
                ) : (
                  <span>{canContinue ? 'Approve USDC' : ctaLabel}</span>
                )}
              </button>
            ) : (
              <button
                onClick={() => setStep('review')}
                disabled={!canContinue}
                className="w-full bg-[#ddb7ff] hover:bg-[#ead7ff] text-[#121212] font-mono text-xs font-bold py-4 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                {step === 'staking' || step === 'confirming' ? (
                  <>
                    <span className="animate-spin text-sm leading-none">↻</span>
                    <span>{step === 'confirming' ? 'Confirming on-chain...' : 'Submitting Stake...'}</span>
                  </>
                ) : (
                  <span>{ctaLabel}</span>
                )}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
