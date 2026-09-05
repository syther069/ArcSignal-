'use client';

import { tradingDesign, useTradingDialog } from '@/components/layout/TradingDesign';

import React, { useEffect, useState } from 'react';
import { useAccount, useWalletClient, usePublicClient, useReadContract } from 'wagmi';
import { decodeEventLog, parseUnits, formatUnits } from 'viem';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Market, StakeSide } from '@/types';
import { USDC_ADDRESS, USDC_ABI } from '@/lib/usdc';
import { arcTestnet, ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import { clearMarketCache } from '@/lib/markets';
import {
  ARC_NETWORK_FEE_HELPER,
  calculateArcGasReserveUsdc,
  calculateMaxArcStakeForAllowance,
  formatArcNetworkFee,
} from '@/lib/arc-gas';
import { useWallet } from '@/hooks/useWallet';
import { useFundUSDCModalLoader } from '@/hooks/useFundUSDCModalLoader';
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
    return 'Insufficient USDC for the stake and Arc network fee. Reduce the amount or top up.';
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
  const dialogRef = useTradingDialog(isOpen);
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [selectedSide, setSelectedSide] = useState<StakeSide>(side);
  const [step, setStep] = useState<'idle' | 'review' | 'approving' | 'staking' | 'confirming' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [estimatedGas, setEstimatedGas] = useState<string | null>(null);
  const [gasReserve, setGasReserve] = useState(10_000n);
  const [fundingOpen, setFundingOpen] = useState(false);
  const { FundUSDCModal, loadFundUSDCModal } = useFundUSDCModalLoader();

  useEffect(() => {
    if (isOpen) setSelectedSide(side);
  }, [isOpen, side]);

  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { isWrongNetwork, switchChain } = useWallet();

  const { data: usdcRaw, refetch: refetchBalance } = useReadContract({
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

  useEffect(() => {
    if (!isOpen || !address) return;
    void Promise.all([refetchBalance(), refetchAllowance()]);
  }, [address, isOpen, refetchAllowance, refetchBalance]);

  const parsedAmount = Math.max(parseFloat(amount) || 0, 0);
  const amountStr = isNaN(parsedAmount) ? '0' : parsedAmount.toString();
  const amountBigInt = parseUnits(amountStr, 6);

  useEffect(() => {
    if (!isOpen || step !== 'review' || !publicClient || !address) return;
    let cancelled = false;
    void (async () => {
      try {
        const gasPrice = await publicClient.getGasPrice();
        const gas = await publicClient.estimateContractGas({
          account: address,
          address: ARCSIGNAL_ADDRESS,
          abi: ARCSIGNAL_ABI,
          functionName: 'stake',
          args: [market.marketId, selectedSide, amountBigInt],
        });
        if (!cancelled) setEstimatedGas(formatArcNetworkFee(gas, gasPrice));
      } catch {
        if (!cancelled) setEstimatedGas('< $0.01');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, amountBigInt, isOpen, market.marketId, publicClient, selectedSide, step]);

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
        btnActive: 'bg-gradient-to-r from-[#b76dff] to-[#ddb7ff] text-[#240b35]',
        pillActive: 'bg-[#ddb7ff] text-[#240b35]',
      }
    : {
        label: 'Fade AI',
        dot: 'bg-[#f3a6c8]',
        text: 'text-[#f3a6c8]',
        badgeBg: 'bg-[#f3a6c8]/10',
        badgeBorder: 'border-[#f3a6c8]/30',
        border: 'border-[#f3a6c8]/35',
        bg: 'bg-[#f3a6c8]/10',
        focus: 'focus-within:border-[#f3a6c8]',
        ring: 'shadow-[0_0_35px_rgba(251,113,133,0.18)]',
        btnActive: 'bg-gradient-to-r from-[#f43f5e] to-[#f3a6c8] text-[#f1eef4]',
        pillActive: 'bg-[#f3a6c8] text-[#240b35]',
      };

  const followProbability = Math.min(Math.max(market.probability ?? market.confidence ?? 50, 1), 99);
  const fadeProbability = 100 - followProbability;
  const impliedProbability = isFollow ? followProbability : fadeProbability;
  const entryPriceCents = impliedProbability;
  const newFollowPool = isFollow ? market.followPool + parsedAmount : market.followPool;
  const newFadePool = !isFollow ? market.fadePool + parsedAmount : market.fadePool;
  const winningPool = isFollow ? newFollowPool : newFadePool;
  const totalPool = newFollowPool + newFadePool;
  const poolShare = winningPool > 0 ? (parsedAmount / winningPool) * 100 : 0;
  const estimatedWin = winningPool > 0 ? (parsedAmount / winningPool) * totalPool : 0;
  const payoutMultiplier = parsedAmount > 0 ? estimatedWin / parsedAmount : 0;
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
  const availableForStake = usdcBalanceBigInt > gasReserve ? usdcBalanceBigInt - gasReserve : 0n;
  const insufficientBalance = hasAmount && amountBigInt > availableForStake;
  
  const validationMessage = marketClosed
    ? 'This market has closed. Trading is disabled.'
    : belowMinimum
      ? `Minimum stake: ${minStake.toFixed(2)} USDC`
      : insufficientBalance
        ? `Insufficient USDC after reserving ${Number(formatUnits(gasReserve, 6)).toFixed(4)} USDC for network fees.`
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

  const handleQuickAdd = (addAmount: number) => {
    const current = parseFloat(amount) || 0;
    const nextVal = (current + addAmount).toFixed(2);
    setAmount(nextVal);
    setError(null);
  };

  const handleMax = async () => {
    if (!publicClient || !address) return;
    try {
      const [latest, allowance, gasPrice] = await Promise.all([
        refetchBalance(),
        publicClient.readContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'allowance',
          args: [address, ARCSIGNAL_ADDRESS],
        }),
        publicClient.getGasPrice(),
      ]);
      const balance = (latest.data as bigint | undefined) ?? 0n;
      const { reserve, maxStake } = calculateMaxArcStakeForAllowance(
        balance,
        allowance,
        gasPrice,
      );
      setGasReserve(reserve);
      setAmount(formatUnits(maxStake, 6));
      setError(maxStake < parseUnits('1', 6)
        ? 'Balance is too low after reserving USDC for network fees.'
        : null);
    } catch (err) {
      const message = friendlyError(err);
      setError(message);
      toast.error(message);
    }
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
      const [freshBalance, gasPrice] = await Promise.all([
        publicClient.readContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'balanceOf',
          args: [address],
        }),
        publicClient.getGasPrice(),
      ]);
      const reserve = calculateArcGasReserveUsdc(gasPrice, true);
      setGasReserve(reserve);
      if (freshBalance < amountBigInt + reserve) {
        throw new Error(`Insufficient USDC balance for the stake plus ${formatUnits(reserve, 6)} USDC reserved for network fees.`);
      }
      const { request } = await publicClient.simulateContract({
        account: address,
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [ARCSIGNAL_ADDRESS, amountBigInt],
      });
      const approveHash = await walletClient.writeContract(request);
      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
      if (approveReceipt.status !== 'success' || approveReceipt.to?.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
        throw new Error('USDC approval transaction failed on-chain.');
      }
      await Promise.all([refetchBalance(), refetchAllowance()]);
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

      const [freshBalance, freshAllowance, gasPrice] = await Promise.all([
        publicClient.readContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'balanceOf',
          args: [address],
        }),
        publicClient.readContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'allowance',
          args: [address, ARCSIGNAL_ADDRESS],
        }),
        publicClient.getGasPrice(),
      ]);

      const reserve = calculateArcGasReserveUsdc(gasPrice, false);
      setGasReserve(reserve);
      if (freshBalance < amountBigInt + reserve) {
        await refetchBalance();
        throw new Error(`Insufficient USDC balance. You need ${amountStr} USDC plus ${formatUnits(reserve, 6)} USDC reserved for network fees.`);
      }

      if (freshAllowance < amountBigInt) {
        await refetchAllowance();
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
      setEstimatedGas(formatArcNetworkFee(gas, gasPrice));

      const stakeHash = await walletClient.writeContract(request);
      setStep('confirming');

      const stakeReceipt = await publicClient.waitForTransactionReceipt({ hash: stakeHash });
      if (stakeReceipt.status !== 'success') {
        throw new Error('Stake transaction failed on-chain. The market may be closed or you may have insufficient USDC.');
      }

      const hasMatchingStakeEvent = stakeReceipt.logs.some((log) => {
        if (log.address.toLowerCase() !== ARCSIGNAL_ADDRESS.toLowerCase()) return false;
        try {
          const decoded = decodeEventLog({
            abi: ARCSIGNAL_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName !== 'Staked') return false;
          const args = decoded.args as {
            marketId: string;
            user: string;
            side: number;
            amount: bigint;
          };
          return args.marketId === market.marketId
            && args.user.toLowerCase() === address.toLowerCase()
            && Number(args.side) === selectedSide
            && args.amount === amountBigInt;
        } catch {
          return false;
        }
      });
      if (!hasMatchingStakeEvent) {
        throw new Error('Confirmed transaction did not contain the expected ArcSignal stake event.');
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
      await Promise.all([refetchBalance(), refetchAllowance()]);
      router.refresh();
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
    <>
    <div className={`${tradingDesign} fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-[140ms]`}>
      {/* Modal Card */}
      <div ref={dialogRef} tabIndex={-1} onKeyDown={event => { if (event.key === 'Escape') handleClose(); }} role="dialog" aria-modal="true" aria-labelledby="stake-modal-title" className="bg-[#1c1b1b] border border-[#403947] shadow-xl w-full max-w-lg rounded-2xl relative overflow-hidden flex flex-col max-h-[calc(100dvh-24px)]">
        
        {/* Top Violet Brand Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ddb7ff] to-transparent" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex justify-between items-center bg-[#1c1b1b]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ddb7ff] animate-pulse" />
            <span id="stake-modal-title" className="font-display text-xl font-semibold text-[#f1eef4]">
              Place a position
            </span>
          </div>
          <button
            onClick={handleClose}
            disabled={step === 'approving' || step === 'staking' || step === 'confirming'}
            className="rounded-full p-1.5 text-[#b0abb5] hover:text-[#f1eef4] hover:bg-white/[0.08] transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <ol aria-label="Stake progress" className="grid grid-cols-3 gap-3 border-b border-[#403947] px-6 py-3 text-[13px]">
          <li className={step === 'idle' ? 'text-[#ddb7ff]' : 'text-[#b0abb5]'}>1. Position & amount</li>
          <li className={step === 'review' ? 'text-[#ddb7ff]' : 'text-[#b0abb5]'}>2. Review</li>
          <li aria-live="polite" className={step === 'success' ? 'text-[#4fdbc8]' : 'text-[#b0abb5]'}>{step === 'success' ? '3. Confirmed' : '3. Confirm'}</li>
        </ol>
        {/* Modal Content */}
        <div className="overflow-y-auto custom-scrollbar flex-1">
          
          {step === 'success' && txHash ? (
            /* ── SUCCESS CONFIRMATION STATE ── */
            <div className="p-8 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#ddb7ff]/15 border border-[#ddb7ff]/40 flex items-center justify-center mb-1 shadow-[0_0_30px_rgba(221,183,255,0.2)]">
                <CheckCircle2 size={32} className="text-[#ddb7ff]" />
              </div>
              
              <h3 className="font-display text-2xl font-bold text-[#f1eef4] tracking-tight">
                Position Confirmed
              </h3>
              
              <p className="font-sans text-xs text-[#f1eef4] max-w-xs leading-relaxed">
                Your <strong className={isFollow ? 'text-[#ddb7ff]' : 'text-[#f3a6c8]'}>{isFollow ? 'FOLLOW AI' : 'FADE AI'}</strong> position of <strong className="font-mono text-[#f1eef4]">{amountStr} USDC</strong> has been executed on-chain.
              </p>

              <div className="bg-[#1c1b1b] w-full p-4 rounded-xl mt-2 border border-white/[0.08] flex flex-col gap-1.5 text-left font-mono">
                <span className="text-[13px] text-[#b0abb5] uppercase tracking-wider">
                  Transaction Hash
                </span>
                <Link
                  href={`/transaction/${txHash}`}
                  className="text-[#ddb7ff] text-xs break-all hover:underline"
                >
                  {txHash}
                </Link>
              </div>

              <button
                onClick={handleClose}
                className="w-full mt-3 bg-[#ddb7ff] hover:bg-[#ddb7ff] text-[#240b35] font-bold py-3.5 rounded-xl transition-colors font-mono text-xs tracking-wider uppercase shadow-lg"
              >
                Done & View Position
              </button>
            </div>

          ) : step === 'review' ? (
            /* ── REVIEW / SIGNING CONFIRMATION STATE ── */
            <div className="p-6 space-y-5">
              <div>
                <p className={`font-mono text-[13px] font-bold ${accent.text} uppercase tracking-widest mb-1`}>
                  Review Position
                </p>
                <h3 className="font-display text-xl font-bold text-[#f1eef4] tracking-tight leading-snug">
                  Confirm Parameters Before Signing
                </h3>
                <p className="font-sans text-xs text-[#b0abb5] mt-1 leading-relaxed">
                  Verify the market side, amount, and projected payout.
                </p>
              </div>

              {/* Review Specs Card */}
              <div className="rounded-xl border border-white/[0.08] bg-[#252229] p-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-[#b0abb5] font-sans">Market</span>
                  <span className="text-[#f1eef4] text-right max-w-[220px] truncate font-display font-semibold">
                    {(market as any).question || (market as any).title || 'Prediction Market'}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#b0abb5] font-sans">Direction</span>
                  <span className={`${accent.text} font-bold`}>{accent.label}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#b0abb5] font-sans">Pool split / Multiplier</span>
                  <span className="text-[#f1eef4] tabular-nums">{entryPriceCents.toFixed(0)}% · {payoutMultiplier.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#b0abb5] font-sans">Your Stake</span>
                  <span className="text-[#f1eef4] font-bold tabular-nums">{amountStr} USDC</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="text-[#b0abb5] font-sans">Contract Fee</span>
                    <span className="text-[#b0abb5] tabular-nums">0.00 USDC</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#b0abb5] font-sans">Network fee</span>
                    <span className="text-[#f1eef4] tabular-nums">{estimatedGas ?? '< $0.01'}</span>
                  </div>
                  <p className="text-[13px] text-[#b0abb5]">{ARC_NETWORK_FEE_HELPER}</p>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#b0abb5] font-sans">Estimated Pool Share</span>
                  <span className="text-[#f1eef4] tabular-nums">{poolShare.toFixed(2)}%</span>
                </div>
                <div className="h-px bg-white/[0.06] w-full" />
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-[#b0abb5] font-sans font-medium">Estimated Win</span>
                  <span className={`${accent.text} font-bold tabular-nums`}>~{estimatedWin.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#b0abb5] font-sans">Net Profit</span>
                  <span className={`font-bold tabular-nums ${isFollow ? 'text-[#ddb7ff]' : 'text-[#f3a6c8]'}`}>
                    {profit >= 0 ? '+' : ''}{profit.toFixed(2)} USDC
                  </span>
                </div>
              </div>

              <p className="font-sans text-[13px] text-[#b0abb5] leading-relaxed">
                  Payouts are non-custodial estimates calculated from current pool shares. The contract charges no platform fee. Final payout is determined upon oracle settlement.
              </p>

              {isWrongNetwork && (
                <button
                  onClick={() => switchChain({ chainId: arcTestnet.id })}
                  className="w-full min-h-[44px] rounded-xl border border-[#f2c66d]/50 bg-[#f2c66d]/10 text-[#f2c66d] text-xs font-semibold font-sans"
                >
                  Switch to Arc Testnet
                </button>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 font-sans">
                <button
                  onClick={() => setStep('idle')}
                  className="min-h-[46px] rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#f1eef4] hover:text-[#f1eef4] text-xs font-semibold transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleStake}
                  disabled={isWrongNetwork || !hasAmount || !!validationMessage}
                  className="min-h-[46px] rounded-xl bg-[#ddb7ff] hover:bg-[#ddb7ff] text-[#240b35] text-xs font-bold transition-all disabled:opacity-50 shadow-lg"
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
                <h3 className="font-display text-sm sm:text-[15px] font-bold text-[#f1eef4] mb-1.5 leading-snug">
                  {(market as any).question || (market as any).title || 'Prediction Market'}
                </h3>
                <div className="flex items-center gap-2 font-mono text-[13px] text-[#b0abb5]">
                  <span className="text-[#ddb7ff] font-semibold">Follow {followProbability.toFixed(0)}%</span>
                  <span>·</span>
                  <span className="text-[#f3a6c8] font-semibold">Fade {fadeProbability.toFixed(0)}%</span>
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
                      ? 'bg-[#ddb7ff] text-[#240b35] shadow-md'
                      : 'text-[#b0abb5] hover:text-[#f1eef4] hover:bg-white/[0.04]'
                  }`}
                >
                  <Sparkles size={14} className={isFollow ? 'text-[#240b35]' : 'text-[#ddb7ff]'} />
                  <span>Follow AI</span>
                  <span className="opacity-80 tabular-nums">({followProbability.toFixed(0)}%)</span>
                </button>

                {/* Fade AI (Coral) */}
                <button
                  type="button"
                  onClick={() => setSelectedSide(1)}
                  className={`min-h-[42px] rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    !isFollow
                      ? 'bg-[#f3a6c8] text-[#240b35] shadow-md'
                      : 'text-[#b0abb5] hover:text-[#f1eef4] hover:bg-white/[0.04]'
                  }`}
                >
                  <X size={14} className={!isFollow ? 'text-[#240b35]' : 'text-[#f3a6c8]'} />
                  <span>Fade AI</span>
                  <span className="opacity-80 tabular-nums">({fadeProbability.toFixed(0)}%)</span>
                </button>
              </div>

              {/* Live Direction Spec Indicator */}
              <div className="flex items-center justify-between text-xs font-sans px-1">
                <span className="inline-flex items-center gap-2 text-[#f1eef4] font-medium">
                  <span className={`h-2 w-2 rounded-full ${accent.dot} animate-pulse`} />
                  Selected Direction: <strong className={accent.text}>{accent.label}</strong>
                </span>
                <span className="font-mono text-[13px] text-[#b0abb5] uppercase tracking-wider">
                  {market.category === 'football' ? `${market.homeTeam} vs ${market.awayTeam}` : market.subType || market.category}
                </span>
              </div>

              {/* Entry Odds Specifications Box */}
              <div className={`rounded-xl border ${accent.border} ${accent.bg} ${accent.ring} p-4 space-y-2.5 transition-all`}>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[13px] uppercase tracking-widest text-[#b0abb5] font-bold">
                     Pool estimate
                  </span>
                  <span className={`text-xs font-bold ${accent.text} tabular-nums`}>
                     {accent.label} signal · {entryPriceCents.toFixed(0)}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <div className="text-2xl font-bold font-mono text-[#f1eef4] tabular-nums tracking-tight">
                      {payoutMultiplier.toFixed(2)}x
                    </div>
                    <div className="text-[13px] text-[#b0abb5] font-sans">Current pool payout multiplier</div>
                  </div>
                  
                  <div className="text-right text-xs font-mono text-[#b0abb5] space-y-0.5">
                    <div>Current pool split: <strong className="text-[#f1eef4]">{impliedProbability.toFixed(0)}%</strong></div>
                    <div className="text-[13px] opacity-70">Payout: stake share × total pool</div>
                  </div>
                </div>
              </div>

              {/* Amount to Stake Input Box */}
              <div className="space-y-2 font-sans">
                <div className="flex justify-between items-end">
                  <label htmlFor="stake-amount" className="font-mono text-[13px] font-bold uppercase tracking-wider text-[#b0abb5]">
                    Amount to Stake
                  </label>
                  <div className="text-right font-mono text-[13px]">
                    <span className="text-[#b0abb5]">
                      Balance:{' '}
                      <strong className="text-[#f1eef4] tabular-nums">
                        {Number(usdcBalanceFormatted).toFixed(2)}
                      </strong>{' '}
                      USDC
                    </span>
                  </div>
                </div>

                {/* Input Field with Violet Focus */}
                <div className={`relative flex items-center bg-[#1c1b1b] border-2 border-white/[0.1] ${accent.focus} rounded-xl p-4 transition-all`}>
                  <div className="flex items-center gap-1.5 mr-3 px-2 py-1 rounded bg-white/[0.06] font-mono text-xs font-bold text-[#ddb7ff]">
                    <DollarSign size={13} className="text-[#ddb7ff]" />
                    <span>USDC</span>
                  </div>
                  
                  <input id="stake-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError(null);
                    }}
                    className="w-full min-w-0 bg-transparent outline-none text-2xl sm:text-3xl font-mono font-bold text-[#f1eef4] placeholder:text-[#f1eef4]/20 tabular-nums"
                    placeholder="0.00"
                  />
                  
                  <button
                    type="button"
                    onClick={() => void handleMax()}
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
                      className="flex-1 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[#f1eef4] hover:text-[#f1eef4] text-[13px] font-semibold transition-colors"
                    >
                      +${preset}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="text-[#b0abb5] font-mono text-[13px]">≈ ${parsedAmount.toFixed(2)} USD</span>
                  {validationMessage && !marketClosed && (
                    <span className="text-[#f3a6c8] font-mono text-[13px] font-medium text-right">
                      {validationMessage}
                    </span>
                  )}
                </div>
                <p className="font-mono text-[13px] text-[#b0abb5]">
                  MAX keeps at least {Number(formatUnits(gasReserve, 6)).toFixed(4)} USDC available for Arc network fees.
                </p>
                {insufficientBalance && (
                  <button
                    type="button"
                    onClick={() => {
                      void loadFundUSDCModal().then(() => setFundingOpen(true));
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#ddb7ff]/30 bg-[#ddb7ff]/10 py-2.5 text-xs font-bold text-[#ddb7ff] transition-colors hover:bg-[#ddb7ff]/20"
                  >
                    Fund USDC on Arc <ArrowRight size={14} />
                  </button>
                )}
              </div>

              {/* Payout Breakdown Specifications */}
              <div className="rounded-xl border border-white/[0.06] bg-[#1c1b1b] p-4 space-y-2.5 font-mono text-xs">
                <div className="text-[13px] font-bold uppercase tracking-wider text-[#b0abb5] mb-1">
                  Payout Breakdown Specifications
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-[#b0abb5] font-sans">Your Stake</span>
                  <span className="text-[#f1eef4] font-semibold tabular-nums">{parsedAmount.toFixed(2)} USDC</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#b0abb5] font-sans">Contract Fee</span>
                  <span className="text-[#b0abb5] tabular-nums">0.00 USDC</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#b0abb5] font-sans">Estimated Pool Share</span>
                  <span className="text-[#f1eef4] tabular-nums">{poolShare.toFixed(2)}%</span>
                </div>

                <div className="h-px bg-white/[0.06] w-full" />

                <div className="flex justify-between items-center">
                  <span className="text-[#f1eef4] font-sans font-medium">Potential Payout (If Win)</span>
                  <span className={`${accent.text} font-bold text-sm tabular-nums`}>
                    {estimatedWin.toFixed(2)} USDC
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#b0abb5] font-sans">Estimated Net Profit</span>
                  <span className={`font-bold tabular-nums ${isFollow ? 'text-[#ddb7ff]' : 'text-[#f3a6c8]'}`}>
                    {profit >= 0 ? '+' : ''}{profit.toFixed(2)} USDC
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-[#f3a6c8]/10 border border-[#f3a6c8]/30 rounded-xl text-[#f3a6c8] text-xs font-mono flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Market Details Dropdown */}
              <details className="group rounded-xl border border-white/[0.06] bg-[#1c1b1b] p-3 text-xs font-mono">
                <summary className="cursor-pointer list-none text-[13px] font-bold uppercase tracking-wider text-[#b0abb5] flex items-center justify-between">
                  <span>Smart Contract & Protocol Specs</span>
                  <ChevronRight size={12} className="transition-transform group-open:rotate-90 text-[#b0abb5]" />
                </summary>
                <div className="mt-3 space-y-2 text-[13px] text-[#b0abb5] border-t border-white/[0.04] pt-2">
                  <div className="flex justify-between gap-3">
                    <span>Contract</span>
                    <span className="text-[#f1eef4] truncate max-w-[190px]">{ARCSIGNAL_ADDRESS}</span>
                  </div>
                  {estimatedGas && (
                    <div className="space-y-1">
                      <div className="flex justify-between gap-3">
                        <span>Network fee</span>
                        <span className="text-[#f1eef4] tabular-nums">{estimatedGas}</span>
                      </div>
                      <p className="text-[#b0abb5]">{ARC_NETWORK_FEE_HELPER}</p>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <span>Market ID</span>
                    <span className="text-[#f1eef4] truncate max-w-[190px]">{market.marketId}</span>
                  </div>
                </div>
              </details>

            </div>
          )}

        </div>

        {/* Modal Footer CTA */}
        {step !== 'success' && step !== 'review' && (
          <div className="p-6 pt-2 border-t border-white/[0.06] bg-[#1c1b1b]">
            {currentAllowance < amountBigInt ? (
              <button
                onClick={handleApprove}
                disabled={!canContinue}
                className="w-full bg-[#ddb7ff] hover:bg-[#ddb7ff] text-[#240b35] font-mono text-xs font-bold py-4 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 uppercase tracking-wider"
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
                className="w-full bg-[#ddb7ff] hover:bg-[#ddb7ff] text-[#240b35] font-mono text-xs font-bold py-4 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                {step === 'staking' || step === 'confirming' ? (
                  <>
                    <span className="animate-spin text-sm leading-none">↻</span>
                    <span>{step === 'confirming' ? 'Finalizing on Arc...' : 'Submitting Stake...'}</span>
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
    {fundingOpen && FundUSDCModal && <FundUSDCModal
      isOpen
      onClose={() => setFundingOpen(false)}
      suggestedAmount={amount}
      onFunded={async () => {
        await refetchBalance();
      }}
    />}
    </>
  );
}
