'use client';

import React, { useEffect, useState } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { decodeEventLog, parseUnits, formatUnits } from 'viem';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Market, StakeSide } from '@/types';
import { USDC_ADDRESS, USDC_ABI } from '@/lib/usdc';
import { arcTestnet, ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import { clearMarketCache } from '@/lib/markets';
import { calculateParimutuelPayoutRaw } from '@/lib/parimutuel-math';
import {
  ARC_NETWORK_FEE_HELPER,
  calculateArcGasReserveUsdc,
  calculateMaxArcStakeForAllowance,
  erc20UsdcToNativeWei,
  formatArcNetworkFee,
} from '@/lib/arc-gas';
import { useWallet } from '@/hooks/useWallet';
import { useArcUsdcBalance } from '@/hooks/useArcUsdcBalance';
import { useFundUSDCModalLoader } from '@/hooks/useFundUSDCModalLoader';
import { useTradingDialog } from '@/components/layout/TradingDesign';
import {
  formatMarketDetailUSDC,
  toHumanUsdcNumber,
  formatMultiplier,
  formatPercentage,
} from './marketDetailFormatters';
import toast from 'react-hot-toast';
import { useGlobalTime } from '@/hooks/useGlobalTime';
import {
  X,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  DollarSign,
  ArrowRight,
} from 'lucide-react';

function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (lower.includes('user rejected') || lower.includes('user denied') || lower.includes('rejected the request'))
    return 'Transaction cancelled — you rejected the request in your wallet.';
  if (lower.includes('insufficient native usdc') || (lower.includes('gas') && lower.includes('insufficient')))
    return 'Insufficient native USDC for Arc gas. Add native USDC or reduce activity and try again.';
  if (lower.includes('insufficient funds') || lower.includes('exceeds the balance'))
    return 'Insufficient USDC for the stake and Arc network fee. Reduce the amount or top up.';
  if (lower.includes('insufficient erc-20 usdc') || lower.includes('insufficient usdc') || lower.includes('insufficient balance'))
    return 'Insufficient ERC-20 USDC balance for this stake.';
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

function parseUsdcInput(value: string) {
  if (!/^\d*(?:\.\d{0,6})?$/.test(value)) return null;
  try {
    return value && Number(value) > 0 ? parseUnits(value, 6) : 0n;
  } catch {
    return null;
  }
}

export interface MarketDetailStakeModalProps {
  market: Market;
  side: StakeSide;
  isOpen: boolean;
  onClose: () => void;
}

export function MarketDetailStakeModal({
  market,
  side,
  isOpen,
  onClose,
}: MarketDetailStakeModalProps) {
  const dialogRef = useTradingDialog(isOpen);
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [selectedSide, setSelectedSide] = useState<StakeSide>(side);
  const [prevSide, setPrevSide] = useState<StakeSide>(side);

  if (side !== prevSide) {
    setPrevSide(side);
    setSelectedSide(side);
  }

  const [step, setStep] = useState<'idle' | 'review' | 'approving' | 'staking' | 'confirming' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [estimatedGas, setEstimatedGas] = useState<string | null>(null);
  const [gasReserve, setGasReserve] = useState(10_000n);
  const [fundingOpen, setFundingOpen] = useState(false);
  const { FundUSDCModal, loadFundUSDCModal } = useFundUSDCModalLoader();

  const nowSeconds = useGlobalTime();
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: arcTestnet.id });
  const { isWrongNetwork, switchChain } = useWallet();
  const {
    nativeWei,
    erc20Raw,
    allowanceRaw,
    refetch: refetchWalletUsdc,
  } = useArcUsdcBalance(address);

  const usdcBalanceKnown = erc20Raw != null;
  const nativeBalanceKnown = nativeWei != null;
  const nativeGasBalanceRaw = nativeWei ?? 0n;
  const usdcBalanceBigInt = erc20Raw ?? 0n;
  const currentAllowance = allowanceRaw ?? 0n;

  useEffect(() => {
    if (!isOpen || !address) return;
    void refetchWalletUsdc();
  }, [address, isOpen, refetchWalletUsdc]);

  const parsedAmount = Math.max(Number(amount) || 0, 0);
  const amountBigInt = parseUsdcInput(amount) ?? 0n;
  const amountStr = formatMarketDetailUSDC(parsedAmount, { includeSuffix: false });
  const invalidPrecision = amount.length > 0 && parseUsdcInput(amount) === null;

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

  // Visual accent styles based on palette
  const accent = isFollow
    ? {
        label: 'Follow AI',
        dot: 'bg-[#4FDBC8]',
        text: 'text-[#4FDBC8]',
        badgeBg: 'bg-[#4FDBC8]/10',
        badgeBorder: 'border-[#4FDBC8]/30',
        border: 'border-[#4FDBC8]/40',
        bg: 'bg-[#4FDBC8]/5',
        focus: 'focus-within:border-[#4FDBC8]',
        ring: 'shadow-[0_0_25px_rgba(79,219,200,0.12)]',
        btnActive: 'bg-[#4FDBC8] text-[#131313]',
      }
    : {
        label: 'Fade AI',
        dot: 'bg-[#F3A6C8]',
        text: 'text-[#F3A6C8]',
        badgeBg: 'bg-[#F3A6C8]/10',
        badgeBorder: 'border-[#F3A6C8]/30',
        border: 'border-[#F3A6C8]/40',
        bg: 'bg-[#F3A6C8]/5',
        focus: 'focus-within:border-[#F3A6C8]',
        ring: 'shadow-[0_0_25px_rgba(243,166,200,0.12)]',
        btnActive: 'bg-[#F3A6C8] text-[#240B35]',
      };

  const confidenceValue = market.confidence ?? 50;
  const currentFollowPoolRaw = BigInt(market.followPoolRaw ?? parseUnits(String(market.followPool || 0), 6));
  const currentFadePoolRaw = BigInt(market.fadePoolRaw ?? parseUnits(String(market.fadePool || 0), 6));
  const totalPoolRaw = currentFollowPoolRaw + currentFadePoolRaw;
  const currentFollowShare = totalPoolRaw > 0n ? Number((currentFollowPoolRaw * 10000n) / totalPoolRaw) / 100 : 50;
  const currentFadeShare = 100 - currentFollowShare;
  const currentPoolSplit = isFollow ? currentFollowShare : currentFadeShare;

  const newFollowPoolRaw = isFollow ? currentFollowPoolRaw + amountBigInt : currentFollowPoolRaw;
  const newFadePoolRaw = !isFollow ? currentFadePoolRaw + amountBigInt : currentFadePoolRaw;
  const winningPoolRaw = isFollow ? newFollowPoolRaw : newFadePoolRaw;
  const losingPoolRaw = isFollow ? newFadePoolRaw : newFollowPoolRaw;

  const payoutRaw = calculateParimutuelPayoutRaw({
    stakeRaw: amountBigInt,
    winningPoolRaw,
    losingPoolRaw,
  });

  const poolShare = winningPoolRaw > 0n
    ? Number((amountBigInt * 10_000n) / winningPoolRaw) / 100
    : 0;

  const estimatedWin = toHumanUsdcNumber(payoutRaw);
  const payoutMultiplier = parsedAmount > 0 ? estimatedWin / parsedAmount : 2.0;
  const profit = estimatedWin - parsedAmount;

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

  const minStake = 1.0;
  const hasAmount = parsedAmount > 0;
  const belowMinimum = hasAmount && parsedAmount < minStake;
  const nativeGasReserveWei = erc20UsdcToNativeWei(gasReserve);
  const insufficientNativeGas = hasAmount && nativeBalanceKnown && nativeGasBalanceRaw < nativeGasReserveWei;
  const insufficientBalance = hasAmount && usdcBalanceKnown && amountBigInt > usdcBalanceBigInt;

  const validationMessage = marketClosed
    ? 'This market has closed. Trading is disabled.'
    : invalidPrecision
      ? 'Enter a valid USDC amount with no more than 6 decimal places.'
      : belowMinimum
        ? `Minimum stake: ${minStake.toFixed(2)} USDC`
        : insufficientNativeGas
          ? `Add native USDC for Arc gas. Keep at least ${formatMarketDetailUSDC(gasReserve)} native USDC available.`
        : insufficientBalance
          ? 'Insufficient ERC-20 USDC balance for this stake.'
          : null;

  const canContinue = step === 'idle' && hasAmount && !validationMessage && !isWrongNetwork;

  const ctaLabel = !hasAmount
    ? 'Enter an amount'
    : marketClosed
      ? 'Market closed'
      : belowMinimum
        ? 'Minimum 1.00 USDC'
        : insufficientNativeGas
          ? 'Insufficient Native Gas'
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
      const [latest, gasPrice] = await Promise.all([
        refetchWalletUsdc(),
        publicClient.getGasPrice(),
      ]);
      const balance = latest.data ? BigInt(latest.data.erc20Raw) : 0n;
      const allowance = latest.data ? BigInt(latest.data.allowanceRaw) : 0n;
      const { reserve } = calculateMaxArcStakeForAllowance(balance, allowance, gasPrice);
      setGasReserve(reserve);
      setAmount(formatUnits(balance, 6));
      setError(balance < parseUnits('1', 6)
        ? 'ERC-20 USDC balance is below the minimum stake.'
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
      const walletUsdc = await refetchWalletUsdc();
      const reserve = gasReserve;
      setGasReserve(reserve);
      if (!walletUsdc.data) {
        throw new Error('USDC balance is temporarily unavailable. Retry in a moment.');
      }
      const freshBalance = BigInt(walletUsdc.data.erc20Raw);
      const freshNative = BigInt(walletUsdc.data.nativeWei);
      if (freshNative < erc20UsdcToNativeWei(reserve)) {
        throw new Error(`Insufficient native USDC for Arc gas. Keep at least ${formatMarketDetailUSDC(reserve)} native USDC available for approval and staking.`);
      }
      if (freshBalance < amountBigInt) {
        throw new Error('Insufficient ERC-20 USDC balance for this stake.');
      }
      const approveHash = await walletClient.writeContract({
        account: address,
        chain: arcTestnet,
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [ARCSIGNAL_ADDRESS, amountBigInt],
      });
      try {
        const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approveReceipt.status !== 'success' || approveReceipt.to?.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
          throw new Error('USDC approval transaction failed on-chain.');
        }
      } catch (receiptError) {
        const refreshed = await refetchWalletUsdc();
        const refreshedAllowance = refreshed.data ? BigInt(refreshed.data.allowanceRaw) : 0n;
        if (refreshedAllowance < amountBigInt) {
          throw new Error('Approval was submitted, but ArcSignal could not verify the updated allowance yet. Check the transaction in your wallet and retry in a moment.', { cause: receiptError });
        }
      }
      await refetchWalletUsdc();
      toast.success('USDC approved successfully!');
      setStep('idle');
    } catch (err: unknown) {
      console.error('[MarketDetailStakeModal] Approval error:', err);
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

      const walletUsdc = await refetchWalletUsdc();
      let gasPrice: bigint | null = null;
      try {
        gasPrice = await publicClient.getGasPrice();
      } catch {
        gasPrice = null;
      }
      if (!walletUsdc.data) {
        throw new Error('USDC balance is temporarily unavailable. Retry in a moment.');
      }
      const freshBalance = BigInt(walletUsdc.data.erc20Raw);
      const freshAllowance = BigInt(walletUsdc.data.allowanceRaw);
      const freshNative = BigInt(walletUsdc.data.nativeWei);

      const reserve = gasPrice ? calculateArcGasReserveUsdc(gasPrice, false) : gasReserve;
      setGasReserve(reserve);
      if (freshNative < erc20UsdcToNativeWei(reserve)) {
        await refetchWalletUsdc();
        throw new Error(`Insufficient native USDC for Arc gas. Keep at least ${formatMarketDetailUSDC(reserve)} native USDC available for staking.`);
      }
      if (freshBalance < amountBigInt) {
        await refetchWalletUsdc();
        throw new Error(`Insufficient ERC-20 USDC balance. You need ${formatMarketDetailUSDC(amountBigInt)} for this stake.`);
      }

      if (freshAllowance < amountBigInt) {
        await refetchWalletUsdc();
        throw new Error('Insufficient USDC allowance. Please approve first.');
      }

      setStep('staking');

      if (gasPrice) {
        try {
          const gas = await publicClient.estimateContractGas({
            account: address,
            address: ARCSIGNAL_ADDRESS,
            abi: ARCSIGNAL_ABI,
            functionName: 'stake',
            args: [market.marketId, selectedSide, amountBigInt],
          });
          setEstimatedGas(formatArcNetworkFee(gas, gasPrice));
        } catch {
          setEstimatedGas(null);
        }
      }

      const stakeHash = await walletClient.writeContract({
        account: address,
        chain: arcTestnet,
        address: ARCSIGNAL_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'stake',
        args: [market.marketId, selectedSide, amountBigInt],
      });
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

      try {
        const pending = JSON.parse(localStorage.getItem('arcsignal:portfolio:pending-stakes') ?? '[]') as Array<Record<string, string>>;
        const next = [
          ...pending.filter((item) => item.txHash !== stakeHash),
          { address: address.toLowerCase(), marketId: market.marketId, txHash: stakeHash, createdAt: String(Date.now()) },
        ].slice(-5);
        localStorage.setItem('arcsignal:portfolio:pending-stakes', JSON.stringify(next));
      } catch {
        // Local storage is a fast local fallback; contract remains authoritative
      }

      if (!voteResponse.ok) {
        console.warn('Immediate portfolio indexing response was not successful:', await voteResponse.text());
      }

      clearMarketCache();
      await refetchWalletUsdc();
      router.refresh();
      setTxHash(stakeHash);
      setEstimatedGas(null);
      toast.success(`Successfully placed ${selectedSide === 0 ? 'FOLLOW' : 'FADE'} position for ${amountStr} USDC!`);
      setStep('success');
    } catch (err: unknown) {
      console.error('[MarketDetailStakeModal] Stake error:', err);
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
    }, 250);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-140">
        {/* Modal Card */}
        <div
          ref={dialogRef}
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === 'Escape') handleClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="market-stake-modal-title"
          className="bg-[#1C1B1B] border border-[#403947] shadow-2xl w-full max-w-lg rounded-2xl relative overflow-hidden flex flex-col max-h-[calc(100dvh-24px)]"
        >
          {/* Top Brand Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#DDB7FF] to-transparent" />

          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-[#403947]/70 flex justify-between items-center bg-[#1C1B1B]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DDB7FF] animate-pulse" />
              <span id="market-stake-modal-title" className="font-display text-xl font-bold text-[#F1EEF4]">
                Stake Position
              </span>
            </div>
            <button
              onClick={handleClose}
              disabled={step === 'approving' || step === 'staking' || step === 'confirming'}
              className="min-h-[44px] min-w-[44px] rounded-lg p-2 text-[#B0ABB5] hover:text-[#F1EEF4] hover:bg-[#252229] transition-colors disabled:opacity-40 flex items-center justify-center"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* 3-Step Progress Stepper */}
          <ol
            aria-label="Stake progress"
            className="grid grid-cols-3 gap-2 border-b border-[#403947]/70 px-6 py-3 font-sans text-xs font-semibold"
          >
            <li className={`flex items-center gap-1.5 ${step === 'idle' ? 'text-[#DDB7FF]' : 'text-[#B0ABB5]'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                step === 'idle' ? 'bg-[#DDB7FF] text-[#240B35]' : 'bg-[#252229] text-[#B0ABB5]'
              }`}>
                1
              </span>
              <span>Position & Amount</span>
            </li>
            <li className={`flex items-center gap-1.5 ${step === 'review' ? 'text-[#DDB7FF]' : 'text-[#B0ABB5]'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                step === 'review' ? 'bg-[#DDB7FF] text-[#240B35]' : 'bg-[#252229] text-[#B0ABB5]'
              }`}>
                2
              </span>
              <span>Review</span>
            </li>
            <li
              aria-live="polite"
              className={`flex items-center gap-1.5 ${
                step === 'success'
                  ? 'text-[#4FDBC8]'
                  : step === 'confirming' || step === 'staking' || step === 'approving'
                  ? 'text-[#F2C66D]'
                  : 'text-[#B0ABB5]'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                step === 'success'
                  ? 'bg-[#4FDBC8] text-[#131313]'
                  : step === 'confirming' || step === 'staking' || step === 'approving'
                  ? 'bg-[#F2C66D] text-[#131313]'
                  : 'bg-[#252229] text-[#B0ABB5]'
              }`}>
                3
              </span>
              <span>{step === 'success' ? 'Confirmed' : 'Confirm'}</span>
            </li>
          </ol>

          {/* Modal Scrollable Body */}
          <div className="overflow-y-auto flex-1 p-6 space-y-5">
            {step === 'success' && txHash ? (
              /* ── 3. SUCCESS STATE ── */
              <div className="py-6 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#4FDBC8]/15 border border-[#4FDBC8]/40 flex items-center justify-center mb-1 shadow-[0_0_30px_rgba(79,219,200,0.2)]">
                  <CheckCircle2 size={32} className="text-[#4FDBC8]" />
                </div>

                <h3 className="font-display text-2xl font-bold text-[#F1EEF4] tracking-tight">
                  Position Confirmed
                </h3>

                <p className="font-sans text-sm text-[#B0ABB5] max-w-sm leading-relaxed">
                  Your{' '}
                  <strong className={isFollow ? 'text-[#4FDBC8]' : 'text-[#F3A6C8]'}>
                    {isFollow ? 'FOLLOW AI' : 'FADE AI'}
                  </strong>{' '}
                  position of{' '}
                  <strong className="font-mono text-[#F1EEF4]">{formatMarketDetailUSDC(parsedAmount)}</strong> has been executed and confirmed on the Arc network.
                </p>

                <div className="bg-[#252229] w-full p-4 rounded-xl border border-[#403947] flex flex-col gap-1.5 text-left font-mono">
                  <span className="text-xs text-[#B0ABB5] uppercase tracking-wider">
                    Transaction Hash
                  </span>
                  <Link
                    href={`/transaction/${txHash}`}
                    className="text-[#DDB7FF] text-xs break-all hover:underline"
                  >
                    {txHash}
                  </Link>
                </div>

                <button
                  onClick={handleClose}
                  className="w-full min-h-[46px] mt-2 bg-[#DDB7FF] hover:bg-[#DDB7FF]/90 text-[#240B35] font-bold py-3 rounded-xl transition-colors font-mono text-xs tracking-wider uppercase shadow-lg flex items-center justify-center"
                >
                  Done & View Position
                </button>
              </div>
            ) : step === 'review' ? (
              /* ── 2. REVIEW STATE ── */
              <div className="space-y-5">
                <div>
                  <p className={`font-mono text-xs font-bold ${accent.text} uppercase tracking-widest mb-1`}>
                    Step 2: Review Parameters
                  </p>
                  <h3 className="font-display text-xl font-bold text-[#F1EEF4] tracking-tight leading-snug">
                    Confirm Position Before Signing
                  </h3>
                  <p className="font-sans text-xs text-[#B0ABB5] mt-1 leading-relaxed">
                    Verify the market side, amount, pool shares, and payout estimates.
                  </p>
                </div>

                {/* Review Specifications Card */}
                <div className="rounded-xl border border-[#403947] bg-[#252229] p-4 space-y-3 font-mono text-xs">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#B0ABB5] font-sans">Market</span>
                    <span className="text-[#F1EEF4] text-right max-w-[220px] truncate font-sans font-semibold">
                      {market.title}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#B0ABB5] font-sans">Direction</span>
                    <span className={`${accent.text} font-bold`}>{accent.label}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#B0ABB5] font-sans">Current Pool Split</span>
                    <span className="text-[#F1EEF4] tabular-nums">{formatPercentage(currentPoolSplit)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#B0ABB5] font-sans">Current Pool Payout Estimate</span>
                    <span className="text-[#F1EEF4] tabular-nums font-bold">{formatMultiplier(payoutMultiplier)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#B0ABB5] font-sans">Your Stake</span>
                    <span className="text-[#F1EEF4] font-bold tabular-nums">{formatMarketDetailUSDC(parsedAmount)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#B0ABB5] font-sans">Protocol Contract Fee</span>
                    <span className="text-[#4FDBC8] tabular-nums font-bold">0.00 USDC (0%)</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-[#B0ABB5] font-sans">Arc Network Fee</span>
                      <span className="text-[#F1EEF4] tabular-nums">{estimatedGas ?? '< $0.01'}</span>
                    </div>
                    <p className="text-[11px] text-[#B0ABB5]/80 font-sans">{ARC_NETWORK_FEE_HELPER}</p>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#B0ABB5] font-sans">Estimated Pool Share</span>
                    <span className="text-[#F1EEF4] tabular-nums">{formatPercentage(poolShare, 2)}</span>
                  </div>
                  <div className="h-px bg-[#403947]/70 w-full" />
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-[#B0ABB5] font-sans font-medium">Estimated Win (If Resolved)</span>
                    <span className={`${accent.text} font-bold tabular-nums`}>
                      ~{formatMarketDetailUSDC(estimatedWin)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#B0ABB5] font-sans">Estimated Net Profit</span>
                    <span className={`font-bold tabular-nums ${isFollow ? 'text-[#4FDBC8]' : 'text-[#F3A6C8]'}`}>
                      {profit >= 0 ? '+' : ''}{formatMarketDetailUSDC(profit)}
                    </span>
                  </div>
                </div>

                <p className="font-sans text-xs text-[#B0ABB5]/90 leading-relaxed">
                  Payouts are non-custodial estimates calculated from current liquidity shares. The contract charges 0% platform fee. Final payout is determined upon oracle settlement.
                </p>

                {isWrongNetwork && (
                  <button
                    onClick={() => switchChain({ chainId: arcTestnet.id })}
                    className="w-full min-h-[44px] rounded-xl border border-[#F2C66D]/50 bg-[#F2C66D]/10 text-[#F2C66D] text-xs font-semibold font-sans flex items-center justify-center"
                  >
                    Switch to Arc Testnet
                  </button>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2 font-sans">
                  <button
                    onClick={() => setStep('idle')}
                    className="min-h-[46px] rounded-xl border border-[#403947] bg-[#252229] hover:bg-[#403947]/40 text-[#F1EEF4] text-xs font-semibold transition-colors flex items-center justify-center"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleStake}
                    disabled={isWrongNetwork || !hasAmount || !!validationMessage}
                    className="min-h-[46px] rounded-xl bg-[#DDB7FF] hover:bg-[#DDB7FF]/90 text-[#240B35] text-xs font-bold transition-all disabled:opacity-40 shadow-lg flex items-center justify-center"
                  >
                    Confirm & Sign
                  </button>
                </div>
              </div>
            ) : (
              /* ── 1. MAIN INPUT & SPECIFICATION STATE ── */
              <div className="space-y-5">
                {/* Market Title Summary */}
                <div>
                  <h3 className="font-display text-[16px] leading-[22px] font-bold text-[#F1EEF4] mb-1.5 leading-snug">
                    {market.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#B0ABB5]">
                    <span className="text-[#4FDBC8] font-semibold">Follow {formatPercentage(currentFollowShare)}</span>
                    <span>·</span>
                    <span className="text-[#F3A6C8] font-semibold">Fade {formatPercentage(currentFadeShare)}</span>
                    <span>·</span>
                    <span className="tabular-nums">Closes {closesLabel}</span>
                  </div>
                </div>

                {/* Follow / Fade Direction Dual Selector */}
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#131313] p-1.5 border border-[#403947]">
                  {/* Follow AI */}
                  <button
                    type="button"
                    onClick={() => setSelectedSide(0)}
                    className={`min-h-[44px] rounded-lg font-sans text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      isFollow
                        ? 'bg-[#4FDBC8] text-[#131313] shadow-md'
                        : 'text-[#B0ABB5] hover:text-[#F1EEF4] hover:bg-white/[0.04]'
                    }`}
                  >
                    <CheckCircle2 size={16} className={isFollow ? 'text-[#131313]' : 'text-[#4FDBC8]'} />
                    <span>Follow AI</span>
                    <span className="font-mono text-[11px] opacity-80 tabular-nums">({formatPercentage(currentFollowShare)})</span>
                  </button>

                  {/* Fade AI */}
                  <button
                    type="button"
                    onClick={() => setSelectedSide(1)}
                    className={`min-h-[44px] rounded-lg font-sans text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      !isFollow
                        ? 'bg-[#F3A6C8] text-[#240B35] shadow-md'
                        : 'text-[#B0ABB5] hover:text-[#F1EEF4] hover:bg-white/[0.04]'
                    }`}
                  >
                    <X size={16} className={!isFollow ? 'text-[#240B35]' : 'text-[#F3A6C8]'} />
                    <span>Fade AI</span>
                    <span className="font-mono text-[11px] opacity-80 tabular-nums">({formatPercentage(currentFadeShare)})</span>
                  </button>
                </div>

                {/* Live Direction Spec Indicator */}
                <div className="flex items-center justify-between text-xs font-sans px-0.5">
                  <span className="inline-flex items-center gap-2 text-[#F1EEF4] font-medium">
                    <span className={`h-2 w-2 rounded-full ${accent.dot} animate-pulse`} />
                    Selected: <strong className={accent.text}>{accent.label}</strong>
                  </span>
                  <span className="font-mono text-xs text-[#B0ABB5]">
                    AI Confidence: <strong className="text-[#F1EEF4]">{confidenceValue}%</strong>
                  </span>
                </div>

                {/* Pool & Payout Specifications Box */}
                <div className={`rounded-xl border ${accent.border} ${accent.bg} ${accent.ring} p-4 space-y-2.5 transition-all`}>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-xs uppercase tracking-wider text-[#B0ABB5] font-bold font-sans">
                      Current Pool Payout Estimate
                    </span>
                    <span className={`text-xs font-bold ${accent.text} tabular-nums`}>
                      {accent.label} · {formatPercentage(currentPoolSplit)}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-4">
                    <div>
                      <div className="text-3xl font-bold font-mono text-[#F1EEF4] tabular-nums tracking-tight">
                        {formatMultiplier(payoutMultiplier)}
                      </div>
                      <div className="text-xs text-[#B0ABB5] font-sans mt-0.5">Estimated return multiplier</div>
                    </div>

                    <div className="text-right text-xs font-mono text-[#B0ABB5] space-y-0.5">
                      <div>Current pool split: <strong className="text-[#F1EEF4]">{formatPercentage(currentPoolSplit)}</strong></div>
                      <div className="text-[11px] opacity-75 font-sans">Payout = stake share × total pool</div>
                    </div>
                  </div>
                </div>

                {/* Amount to Stake Input Box */}
                <div className="space-y-2 font-sans">
                  <div className="flex justify-between items-end">
                    <label htmlFor="market-stake-amount" className="font-mono text-xs font-bold uppercase tracking-wider text-[#B0ABB5]">
                      Amount to Stake
                    </label>
                    <div className="text-right font-mono text-xs">
                      <span className="text-[#B0ABB5]">
                        ERC-20:{' '}
                        <strong className="text-[#F1EEF4] tabular-nums">
                          {usdcBalanceKnown ? formatMarketDetailUSDC(usdcBalanceBigInt) : '…'}
                        </strong>{' '}
                        · Gas:{' '}
                        <strong className="text-[#F1EEF4] tabular-nums">
                          {nativeBalanceKnown ? Number(formatUnits(nativeGasBalanceRaw, 18)).toFixed(4) : '…'}
                        </strong>{' '}
                        native
                      </span>
                    </div>
                  </div>

                  {/* Input Field with Focus Ring */}
                  <div className={`relative flex items-center bg-[#252229] border border-[#403947] ${accent.focus} rounded-xl p-3.5 transition-all focus-within:ring-2 focus-within:ring-[#DDB7FF]`}>
                    <div className="flex items-center gap-1.5 mr-3 px-2.5 py-1 rounded bg-[#1C1B1B] font-mono text-xs font-bold text-[#DDB7FF] border border-[#403947]/60">
                      <DollarSign size={13} className="text-[#DDB7FF]" />
                      <span>USDC</span>
                    </div>

                    <input
                      id="market-stake-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setError(null);
                      }}
                      className="w-full min-w-0 bg-transparent outline-none text-2xl sm:text-3xl font-mono font-bold text-[#F1EEF4] placeholder:text-[#B0ABB5]/30 tabular-nums"
                      placeholder="0.00"
                    />

                    <button
                      type="button"
                      onClick={() => void handleMax()}
                      className="min-h-[36px] px-3 py-1 rounded-lg bg-[#DDB7FF]/15 hover:bg-[#DDB7FF]/25 border border-[#DDB7FF]/30 text-[#DDB7FF] font-mono text-xs font-bold transition-colors shrink-0 flex items-center justify-center"
                    >
                      MAX
                    </button>
                  </div>

                  {/* Quick Add Presets (min 44px touch targets) */}
                  <div className="flex items-center gap-2 pt-1 font-mono text-xs">
                    {[10, 25, 50, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleQuickAdd(preset)}
                        className="min-h-[44px] flex-1 py-1 rounded-lg bg-[#252229] hover:bg-[#403947]/50 border border-[#403947] text-[#F1EEF4] text-xs font-semibold transition-colors flex items-center justify-center"
                      >
                        +${preset}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5 font-mono">
                    <span className="text-[#B0ABB5]">≈ {formatMarketDetailUSDC(parsedAmount)}</span>
                    {validationMessage && !marketClosed && (
                      <span className="text-[#FFB4AB] font-medium text-right font-sans">
                        {validationMessage}
                      </span>
                    )}
                  </div>

                  <p className="font-sans text-[11px] text-[#B0ABB5]/80">
                    Arc gas is paid from native USDC. Keep at least {formatMarketDetailUSDC(gasReserve)} native USDC available.
                  </p>

                  {(insufficientBalance || insufficientNativeGas) && (
                    <button
                      type="button"
                      onClick={() => {
                        void loadFundUSDCModal().then(() => setFundingOpen(true));
                      }}
                      className="min-h-[44px] flex w-full items-center justify-center gap-2 rounded-xl border border-[#DDB7FF]/30 bg-[#DDB7FF]/10 py-2.5 text-xs font-bold text-[#DDB7FF] transition-colors hover:bg-[#DDB7FF]/20 font-sans"
                    >
                      Fund USDC on Arc <ArrowRight size={14} />
                    </button>
                  )}
                </div>

                {/* Payout Breakdown Specifications */}
                <div className="rounded-xl border border-[#403947] bg-[#252229] p-4 space-y-2.5 font-mono text-xs">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#B0ABB5] mb-1 font-sans">
                    Payout Breakdown Specifications
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#B0ABB5] font-sans">Your Stake</span>
                    <span className="text-[#F1EEF4] font-semibold tabular-nums">{formatMarketDetailUSDC(parsedAmount)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#B0ABB5] font-sans">Contract Trading Fee</span>
                    <span className="text-[#4FDBC8] font-semibold tabular-nums">0.00 USDC (0%)</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#B0ABB5] font-sans">Estimated Pool Share</span>
                    <span className="text-[#F1EEF4] tabular-nums">{formatPercentage(poolShare, 2)}</span>
                  </div>

                  <div className="h-px bg-[#403947]/70 w-full" />

                  <div className="flex justify-between items-center">
                    <span className="text-[#F1EEF4] font-sans font-medium">Potential Payout (If Win)</span>
                    <span className={`${accent.text} font-bold text-sm tabular-nums`}>
                      ~{formatMarketDetailUSDC(estimatedWin)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#B0ABB5] font-sans">Estimated Net Profit</span>
                    <span className={`font-bold tabular-nums ${isFollow ? 'text-[#4FDBC8]' : 'text-[#F3A6C8]'}`}>
                      {profit >= 0 ? '+' : ''}{formatMarketDetailUSDC(profit)}
                    </span>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-[#FFB4AB]/10 border border-[#FFB4AB]/30 rounded-xl text-[#FFB4AB] text-xs font-sans flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Smart Contract Transparency */}
                <details className="group rounded-xl border border-[#403947] bg-[#252229] p-3 text-xs font-mono">
                  <summary className="min-h-[36px] cursor-pointer list-none text-xs font-bold uppercase tracking-wider text-[#B0ABB5] flex items-center justify-between font-sans">
                    <span>Protocol Contract & Gas Info</span>
                    <ChevronRight size={14} className="transition-transform group-open:rotate-90 text-[#B0ABB5]" />
                  </summary>
                  <div className="mt-3 space-y-2 text-xs text-[#B0ABB5] border-t border-[#403947]/60 pt-2">
                    <div className="flex justify-between gap-3">
                      <span>Contract</span>
                      <span className="text-[#F1EEF4] truncate max-w-[200px]">{ARCSIGNAL_ADDRESS}</span>
                    </div>
                    {estimatedGas && (
                      <div className="space-y-0.5">
                        <div className="flex justify-between gap-3">
                          <span>Network Fee</span>
                          <span className="text-[#F1EEF4] tabular-nums">{estimatedGas}</span>
                        </div>
                        <p className="text-[11px] text-[#B0ABB5]/80 font-sans">{ARC_NETWORK_FEE_HELPER}</p>
                      </div>
                    )}
                    <div className="flex justify-between gap-3">
                      <span>Market ID</span>
                      <span className="text-[#F1EEF4] truncate max-w-[200px]">{market.marketId}</span>
                    </div>
                  </div>
                </details>
              </div>
            )}
          </div>

          {/* Modal Footer CTA */}
          {step !== 'success' && step !== 'review' && (
            <div className="p-6 pt-3 border-t border-[#403947]/70 bg-[#1C1B1B]">
              {currentAllowance < amountBigInt ? (
                <button
                  onClick={handleApprove}
                  disabled={!canContinue}
                  className="w-full min-h-[48px] bg-[#DDB7FF] hover:bg-[#DDB7FF]/90 text-[#240B35] font-mono text-xs font-bold py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 uppercase tracking-wider"
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
                  className="w-full min-h-[48px] bg-[#DDB7FF] hover:bg-[#DDB7FF]/90 text-[#240B35] font-mono text-xs font-bold py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 uppercase tracking-wider"
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
