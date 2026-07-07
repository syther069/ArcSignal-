'use client';

import React, { useState } from 'react';
import { useAccount, useWalletClient, usePublicClient, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { Market, StakeSide } from '@/types';
import { USDC_ADDRESS, USDC_ABI } from '@/lib/usdc';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import toast from 'react-hot-toast';

export interface StakeModalProps {
  market: Market;
  side: StakeSide;
  isOpen: boolean;
  onClose: () => void;
}

export function StakeModal({ market, side, isOpen, onClose }: StakeModalProps) {
  const [amount, setAmount] = useState('50');
  const [step, setStep] = useState<'idle' | 'approving' | 'staking' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const { data: usdcRaw } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const usdcBalanceBigInt = (usdcRaw as bigint | undefined) ?? 0n;
  const usdcBalanceFormatted = formatUnits(usdcBalanceBigInt, 6);

  const { data: usdcAllowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, ARCSIGNAL_ADDRESS] : undefined,
    query: { enabled: !!address },
  });
  const currentAllowance = (usdcAllowanceRaw as bigint | undefined) ?? 0n;

  const parsedAmount = parseFloat(amount) || 0;
  const amountStr = isNaN(parsedAmount) ? '0' : parsedAmount.toString();
  const amountBigInt = parseUnits(amountStr, 6);

  if (!isOpen) return null;

  const isFollow = side === 0;

  const newFollowPool = isFollow ? market.followPool + parsedAmount : market.followPool;
  const newFadePool   = !isFollow ? market.fadePool + parsedAmount : market.fadePool;
  const winningPool   = isFollow ? newFollowPool : newFadePool;
  const totalPool     = newFollowPool + newFadePool;
  const poolShare     = winningPool > 0 ? (parsedAmount / winningPool) * 100 : 0;
  const payout        = winningPool > 0 ? (parsedAmount / winningPool) * totalPool : 0;

  const handleApprove = async () => {
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
      const message = err instanceof Error ? err.message : 'Approval failed. Please try again.';
      toast.error(message);
      setError(message);
      setStep('idle');
    }
  };

  const handleStake = async () => {
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
      const stakeHash = await walletClient.writeContract({
        address: ARCSIGNAL_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'stake',
        args: [market.marketId, side, amountBigInt],
      });

      const stakeReceipt = await publicClient.waitForTransactionReceipt({ hash: stakeHash });
      if (stakeReceipt.status === 'reverted') {
        throw new Error('Stake transaction failed on-chain. The market may be closed or you may have insufficient USDC.');
      }

      await fetch(`/api/markets/${market.marketId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: side === 0 ? 'follow' : 'fade',
          amount: amountStr,
          walletAddress: address,
          txHash: stakeHash,
        }),
      });

      setTxHash(stakeHash);
      toast.success(`Successfully placed ${side === 0 ? 'FOLLOW' : 'FADE'} position for ${amountStr} USDC!`);
      setStep('success');
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Transaction failed. Please try again.';
      toast.error(message);
      setError(message);
      setStep('idle');
    }
  };

  const handleClose = () => {
    if (step === 'approving' || step === 'staking') return;
    setTimeout(() => {
      setAmount('50');
      setError(null);
      setTxHash(null);
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
            disabled={step === 'approving' || step === 'staking'}
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
            <div className="w-16 h-16 rounded-full bg-[#4fdbc8]/20 flex items-center justify-center mb-2">
              <div className="w-8 h-8 rounded-full bg-[#4fdbc8] text-[#0f172a] flex items-center justify-center text-xl font-bold">
                ✓
              </div>
            </div>
            <h3 className="font-[family-name:var(--font-hanken)] text-2xl font-bold text-white">
              Position Recorded
            </h3>
            <p className="text-sm text-[#94a3b8]">
              Your{' '}
              <strong className={isFollow ? 'text-[#4fdbc8]' : 'text-[#ffb4ab]'}>
                {isFollow ? 'FOLLOW' : 'FADE'}
              </strong>{' '}
              position has been successfully recorded on Arc Testnet.
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
        ) : (
          /* INPUT STATE */
          <>
            {/* Market Info */}
            <div className="p-6 bg-[#131313]/60 border-b border-[#1e293b]">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm font-bold text-white mb-1 leading-tight font-[family-name:var(--font-hanken)]">
                    {market.title}
                  </div>
                  <div className="text-xs text-[#94a3b8]">
                    {market.category === 'football'
                      ? `${market.homeTeam} vs ${market.awayTeam}`
                      : market.subType || market.category}
                  </div>
                </div>
                <div
                  className={`px-3 py-1.5 text-[10px] font-bold font-[family-name:var(--font-jetbrains-mono)] tracking-widest rounded-lg border shrink-0 uppercase ${
                    isFollow
                      ? 'bg-[#4fdbc8]/20 text-[#4fdbc8] border-[#4fdbc8]/30'
                      : 'bg-[#ffb4ab]/20 text-[#ffb4ab] border-[#ffb4ab]/30'
                  }`}
                >
                  {isFollow ? 'Follow AI' : 'Fade AI'}
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mx-6 mt-4 p-3 bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 rounded-lg text-[#ffb4ab] text-xs font-[family-name:var(--font-jetbrains-mono)]">
                {error}
              </div>
            )}

            {/* Input */}
            <div className="p-6 space-y-6">
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

                <div className="relative flex items-center bg-[#131313] border-2 border-[#1e293b] focus-within:border-[#ddb7ff]/60 rounded-lg p-4 pt-6 transition-all">
                  <span className="absolute top-2 left-4 text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#ddb7ff]/60 uppercase tracking-wider">
                    USDC
                  </span>
                  <span className="text-2xl text-[#ddb7ff] mr-3 opacity-60 font-bold">›</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-transparent outline-none text-3xl font-[family-name:var(--font-jetbrains-mono)] text-white placeholder:text-white/20"
                    placeholder="0.00"
                  />
                  <button
                    onClick={() => setAmount(usdcBalanceFormatted)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#ddb7ff] bg-[#ddb7ff]/10 hover:bg-[#ddb7ff]/20 border border-[#ddb7ff]/20 px-3 py-1.5 rounded transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-3 pt-1">
                <div className="flex justify-between items-center text-xs font-[family-name:var(--font-jetbrains-mono)]">
                  <span className="text-[#94a3b8]">Estimated Pool Share</span>
                  <span className="text-white">{poolShare.toFixed(2)}%</span>
                </div>
                <div className="h-px bg-[#1e293b] w-full" />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] tracking-widest text-[#94a3b8] uppercase">
                    Estimated Payout
                  </span>
                  <span className="text-xl font-[family-name:var(--font-jetbrains-mono)] text-[#4fdbc8] font-bold">
                    ~{payout.toFixed(2)} USDC
                  </span>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="p-6 pt-0">
              {currentAllowance < amountBigInt ? (
                <button
                  onClick={handleApprove}
                  disabled={step !== 'idle' || parsedAmount <= 0}
                  className="w-full bg-[#34d399] text-[#0f172a] font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold py-4 tracking-widest hover:brightness-110 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase"
                >
                  {step === 'approving' ? (
                    <>
                      <span className="animate-spin text-lg leading-none">↻</span>
                      Approving USDC...
                    </>
                  ) : (
                    '1. Approve USDC'
                  )}
                </button>
              ) : (
                <button
                  onClick={handleStake}
                  disabled={step !== 'idle' || parsedAmount <= 0}
                  className="w-full bg-[#ddb7ff] text-[#0f172a] font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold py-4 tracking-widest hover:brightness-110 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase"
                >
                  {step === 'staking' ? (
                    <>
                      <span className="animate-spin text-lg leading-none">↻</span>
                      Placing your position...
                    </>
                  ) : (
                    'Create position'
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
