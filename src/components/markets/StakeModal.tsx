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

  // Fallback: strip technical noise, keep first sentence only
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
  const accent = isFollow
    ? {
        label: 'Follow AI',
        dot: 'bg-[#14b8a6]',
        text: 'text-[#5eead4]',
        border: 'border-[#14b8a6]/35',
        bg: 'bg-[#14b8a6]/10',
        focus: 'focus-within:border-[#14b8a6]/70',
        ring: 'shadow-[0_0_30px_rgba(20,184,166,0.14)]',
      }
    : {
        label: 'Fade AI',
        dot: 'bg-[#fb7185]',
        text: 'text-[#fda4af]',
        border: 'border-[#fb7185]/35',
        bg: 'bg-[#fb7185]/10',
        focus: 'focus-within:border-[#fb7185]/70',
        ring: 'shadow-[0_0_30px_rgba(251,113,133,0.14)]',
      };

  const followProbability = Math.min(Math.max(market.probability ?? market.confidence ?? 50, 1), 99);
  const fadeProbability = 100 - followProbability;
  const impliedProbability = isFollow ? followProbability : fadeProbability;
  const entryPriceCents = impliedProbability;
  const payoutMultiplier = 100 / impliedProbability;
  const platformFeeRate = 0.02;
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

      await fetch(`/api/markets/${market.marketId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: selectedSide === 0 ? 'follow' : 'fade',
          amount: amountStr,
          walletAddress: address,
          txHash: stakeHash,
        }),
      });

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020817]/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-[#1e293b] shadow-[0_0_40px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(221,183,255,0.03)] w-full max-w-md rounded-xl relative overflow-hidden">
        {/* Top decorative line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#ddb7ff]/50 to-transparent" />

        {/* Header */}
        <div className="p-6 border-b border-[#1e293b] flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-bold text-[#ddb7ff] tracking-[0.12em] uppercase">
              Position Entry
            </span>
            <h2 className="font-[family-name:var(--font-hanken)] text-xl font-bold text-white">
              Place Position
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={step === 'approving' || step === 'staking' || step === 'confirming'}
            className="text-[#94a3b8] hover:text-white transition-colors disabled:opacity-50"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {step === 'success' && txHash ? (
          /* SUCCESS STATE */
          <div className="p-8 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#ddb7ff]/20 flex items-center justify-center mb-2">
              <div className="w-8 h-8 rounded-full bg-[#ddb7ff] text-[#0f172a] flex items-center justify-center text-xl font-bold">
                ✓
              </div>
            </div>
            <h3 className="font-[family-name:var(--font-hanken)] text-2xl font-bold text-white">
              Position Recorded
            </h3>
            <p className="text-sm text-[#94a3b8]">
              Your{' '}
              <strong className={isFollow ? 'text-[#ddb7ff]' : 'text-[#ffb4ab]'}>
                {isFollow ? 'FOLLOW' : 'FADE'}
              </strong>{' '}
              position has been confirmed on-chain.
            </p>

            <div className="bg-[#131313] w-full p-4 rounded-lg mt-2 border border-[#1e293b] flex flex-col gap-2">
              <span className="text-[10px] text-[#94a3b8] font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-wider">
                TX Hash
              </span>
              <a
                href={`https://testnet.arcscan.app/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#ddb7ff] font-[family-name:var(--font-jetbrains-mono)] text-xs break-all hover:underline"
              >
                {txHash}
              </a>
            </div>

            <button
              onClick={handleClose}
              className="w-full mt-2 bg-[#ddb7ff]/10 hover:bg-[#ddb7ff]/20 text-[#ddb7ff] border border-[#ddb7ff]/25 font-bold py-3 rounded-lg transition-colors font-[family-name:var(--font-jetbrains-mono)] text-[11px] tracking-widest uppercase"
            >
              Done
            </button>
          </div>
        ) : step === 'review' ? (
          <div className="p-6 space-y-5">
            <div>
              <p className={`text-[10px] ${accent.text} font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-widest mb-2`}>Review position</p>
              <h3 className="text-xl font-[family-name:var(--font-hanken)] font-bold text-white leading-tight">
                Confirm before signing
              </h3>
              <p className="text-xs text-[#94a3b8] mt-2 leading-relaxed">
                Check the market, side, and amount. Your wallet will ask for final approval in the next step.
              </p>
            </div>

            <div className="rounded-xl border border-[#1e293b] bg-[#131313] p-4 space-y-3 text-xs">
              <div className="flex justify-between gap-4"><span className="text-[#94a3b8]">Market</span><span className="text-white text-right max-w-[230px]">{(market as any).question || (market as any).title || 'Prediction Market'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-[#94a3b8]">Position</span><span className={`${accent.text} font-semibold`}>{accent.label}</span></div>
              <div className="flex justify-between gap-4"><span className="text-[#94a3b8]">Entry odds</span><span className="text-white font-[family-name:var(--font-jetbrains-mono)]">{entryPriceCents.toFixed(0)}c / {payoutMultiplier.toFixed(2)}x</span></div>
              <div className="flex justify-between gap-4"><span className="text-[#94a3b8]">Stake</span><span className="text-white font-[family-name:var(--font-jetbrains-mono)]">{amountStr} USDC</span></div>
              <div className="flex justify-between gap-4"><span className="text-[#94a3b8]">Platform fee</span><span className="text-white font-[family-name:var(--font-jetbrains-mono)]">-{platformFee.toFixed(2)} USDC</span></div>
              <div className="flex justify-between gap-4"><span className="text-[#94a3b8]">Estimated pool share</span><span className="text-white font-[family-name:var(--font-jetbrains-mono)]">{poolShare.toFixed(2)}%</span></div>
              <div className="flex justify-between gap-4"><span className="text-[#94a3b8]">Estimated win</span><span className={`${accent.text} font-[family-name:var(--font-jetbrains-mono)]`}>~{estimatedWin.toFixed(2)} USDC</span></div>
              <div className="flex justify-between gap-4"><span className="text-[#94a3b8]">Profit</span><span className={`font-[family-name:var(--font-jetbrains-mono)] ${profit >= 0 ? 'text-[#5eead4]' : 'text-[#fda4af]'}`}>{profit >= 0 ? '+' : ''}{profit.toFixed(2)} USDC</span></div>
            </div>

            <p className="text-[10px] text-[#94a3b8] leading-relaxed">
              Payouts are estimates and can change as other users enter the pool. The transaction is final once confirmed on-chain.
            </p>

            {isWrongNetwork && (
              <button
                onClick={() => switchChain({ chainId: 5042002 })}
                className="w-full min-h-[44px] rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-400 text-xs font-semibold"
              >
                Switch to Arc Testnet
              </button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setStep('idle')}
                className={`min-h-[48px] rounded-lg border border-[#3a3939] text-[#94a3b8] text-xs font-semibold hover:text-white ${isFollow ? 'hover:border-[#14b8a6]/40' : 'hover:border-[#fb7185]/40'} transition-colors`}
              >
                Back
              </button>
              <button
                onClick={handleStake}
                disabled={isWrongNetwork || !hasAmount || !!validationMessage}
                className="min-h-[48px] rounded-lg bg-[#6D28D9] text-white text-xs font-bold hover:bg-[#7C3AED] transition-all disabled:cursor-not-allowed disabled:opacity-40"
              >
                Confirm & sign
              </button>
            </div>
          </div>
        ) : (
          /* INPUT STATE */
          <>
            <div className="p-6 bg-[#131313]/60 border-b border-[#1e293b] space-y-4">
              <div>
                <div className="text-sm font-bold text-white mb-2 leading-tight font-[family-name:var(--font-hanken)]">
                  {(market as any).question || (market as any).title || 'Prediction Market'}
                </div>
                <div className="text-xs text-[#94a3b8]">
                  Follow {followProbability.toFixed(0)}% · Fade {fadeProbability.toFixed(0)}% · Closes {closesLabel}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#020817] p-1 border border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => setSelectedSide(0)}
                  className={`min-h-[40px] rounded-md text-xs font-bold transition-all ${
                    isFollow
                      ? 'bg-[#14b8a6] text-[#022c22]'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  Follow AI
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSide(1)}
                  className={`min-h-[40px] rounded-md text-xs font-bold transition-all ${
                    !isFollow
                      ? 'bg-[#fb7185] text-[#3f0611]'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  Fade AI
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                <span className="inline-flex items-center gap-2 text-white">
                  <span className={`h-2 w-2 rounded-full ${accent.dot}`} />
                  Direction: {accent.label}
                </span>
                <span className="text-[#94a3b8]">Market: {market.category === 'football' ? `${market.homeTeam} vs ${market.awayTeam}` : market.subType || market.category}</span>
              </div>
            </div>

            {isWrongNetwork && (
              <div className="mx-6 mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300" role="alert">
                <div className="flex items-center justify-between gap-3">
                  <span>Switch to Arc Testnet to approve or stake.</span>
                  <button
                    onClick={() => switchChain({ chainId: 5042002 })}
                    className="min-h-[36px] shrink-0 rounded-md bg-amber-400 px-3 text-[10px] font-bold uppercase tracking-wide text-[#1a0a00]"
                  >
                    Switch
                  </button>
                </div>
              </div>
            )}

            {marketClosed && (
              <div className="mx-6 mt-4 rounded-lg border border-[#ffb4ab]/30 bg-[#ffb4ab]/10 p-3 text-xs text-[#ffb4ab]" role="alert">
                This market has closed. Trading is disabled.
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mx-6 mt-4 p-3 bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 rounded-lg text-[#ffb4ab] text-xs font-[family-name:var(--font-jetbrains-mono)]">
                {error}
              </div>
            )}

            {/* Input */}
            <div className="p-6 space-y-6">
              <div className={`rounded-lg border ${accent.border} ${accent.bg} ${accent.ring} p-4 space-y-3`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-widest text-[#94a3b8]">
                    Entry Odds
                  </span>
                  <span className={`text-xs font-semibold ${accent.text}`}>{accent.label} @ {entryPriceCents.toFixed(0)}c</span>
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-2xl font-bold text-white font-[family-name:var(--font-jetbrains-mono)]">
                      {payoutMultiplier.toFixed(2)}x
                    </div>
                    <div className="text-xs text-[#94a3b8]">Potential payout</div>
                  </div>
                  <div className="text-right text-xs text-[#94a3b8]">
                    <div>Implied: {impliedProbability.toFixed(0)}%</div>
                    <div>Stake x (1 / {(impliedProbability / 100).toFixed(2)})</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] tracking-widest text-[#94a3b8] uppercase">
                    Amount to Stake
                  </label>
                  <div className="text-right">
                    <span className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] block">
                      Balance:{' '}
                      <span className="text-white">
                        {Number(usdcBalanceFormatted).toFixed(2)}
                      </span>{' '}
                      USDC
                    </span>
                  </div>
                </div>

                <div className={`relative flex items-center bg-[#0b1220] border-2 border-[#1e293b] ${accent.focus} rounded-lg p-4 transition-all`}>
                  <span className={`text-xs font-[family-name:var(--font-jetbrains-mono)] ${accent.text} uppercase tracking-wider mr-4`}>
                    USDC
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError(null);
                    }}
                    className="w-full min-w-0 bg-transparent outline-none text-3xl font-[family-name:var(--font-jetbrains-mono)] text-white placeholder:text-white/20"
                    placeholder="0.00"
                  />
                  <button
                    type="button"
                    onClick={() => setAmount(usdcBalanceFormatted)}
                    className="text-xs font-[family-name:var(--font-jetbrains-mono)] text-[#7C3AED] hover:text-[#a78bfa] transition-colors"
                  >
                    MAX
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-[#94a3b8]">${parsedAmount.toFixed(2)} USD</span>
                  {validationMessage && !marketClosed && <span className="text-[#ffb4ab] text-right">{validationMessage}</span>}
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] tracking-widest text-[#94a3b8] uppercase">
                  Payout Breakdown
                </div>
                <div className="flex justify-between items-center text-xs font-[family-name:var(--font-jetbrains-mono)]">
                  <span className="text-[#94a3b8]">Your stake</span>
                  <span className="text-white">{parsedAmount.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between items-center text-xs font-[family-name:var(--font-jetbrains-mono)]">
                  <span className="text-[#94a3b8]">Platform fee (2%)</span>
                  <span className="text-white">-{platformFee.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between items-center text-xs font-[family-name:var(--font-jetbrains-mono)]">
                  <span className="text-[#94a3b8]">Net pool share</span>
                  <span className="text-white">{poolShare.toFixed(2)}%</span>
                </div>
                <div className="h-px bg-[#1e293b] w-full" />
                <div className="flex justify-between items-center text-xs font-[family-name:var(--font-jetbrains-mono)]">
                  <span className="text-[#94a3b8]">If correct, win</span>
                  <span className={`${accent.text} font-bold`}>{estimatedWin.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between items-center text-xs font-[family-name:var(--font-jetbrains-mono)]">
                  <span className="text-[#94a3b8]">Profit</span>
                  <span className={`font-bold ${profit >= 0 ? 'text-[#5eead4]' : 'text-[#fda4af]'}`}>{profit >= 0 ? '+' : ''}{profit.toFixed(2)} USDC</span>
                </div>
              </div>

              {hasAmount && !validationMessage && (
                <div className="text-[11px] text-[#94a3b8] leading-relaxed">
                  You are risking {parsedAmount.toFixed(2)} USDC. If the market resolves against {accent.label}, you lose your stake. Odds can move before the transaction confirms.
                </div>
              )}

              <details className="group rounded-lg border border-[#1e293b] bg-[#131313]/60 p-3 text-xs">
                <summary className="cursor-pointer list-none font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-widest text-[#94a3b8]">
                  Market Details
                </summary>
                <div className="mt-3 space-y-2 font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[#94a3b8]">
                  <div className="flex justify-between gap-3"><span>Contract</span><span className="text-white break-all text-right">{ARCSIGNAL_ADDRESS}</span></div>
                  {estimatedGas && <div className="flex justify-between gap-3"><span>Estimated gas</span><span className="text-white">~{Number(estimatedGas).toFixed(6)} ARC</span></div>}
                  <div className="flex justify-between gap-3"><span>Market ID</span><span className="text-white break-all text-right">{market.marketId}</span></div>
                </div>
              </details>
            </div>

            {/* Action */}
            <div className="p-6 pt-0">
              {currentAllowance < amountBigInt ? (
                <button
                  onClick={handleApprove}
                  disabled={!canContinue}
                  className="w-full bg-[#6D28D9] text-white font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold py-4 tracking-widest hover:bg-[#7C3AED] rounded-lg transition-all disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-2 uppercase"
                >
                  {step === 'approving' ? (
                    <>
                      <span className="animate-spin text-lg leading-none">↻</span>
                      Approving USDC...
                    </>
                  ) : (
                    canContinue ? 'Approve USDC' : ctaLabel
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setStep('review')}
                  disabled={!canContinue}
                  className="w-full bg-[#6D28D9] text-white font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold py-4 tracking-widest hover:bg-[#7C3AED] rounded-lg transition-all disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-2 uppercase"
                >
                  {step === 'staking' || step === 'confirming' ? (
                    <>
                      <span className="animate-spin text-lg leading-none">↻</span>
                      {step === 'confirming' ? 'Confirming on-chain...' : 'Placing your position...'}
                    </>
                  ) : (
                    ctaLabel
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
