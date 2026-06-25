'use client';

import React, { useState } from 'react';
import { useAccount, useBalance, useReadContract, useWalletClient, usePublicClient } from 'wagmi';
import { parseUnits } from 'viem';
import { Market, StakeSide } from '@/types';
import { USDC_ADDRESS, ArcSignal_ADDRESS, USDC_ABI, approveUSDC } from '@/lib/usdc';
import { stakeOnMarket } from '@/lib/stake';

export interface StakeModalProps {
  market: Market;
  side: StakeSide;
  isOpen: boolean;
  onClose: () => void;
}

export function StakeModal({ market, side, isOpen, onClose }: StakeModalProps) {
  const [amount, setAmount] = useState('50');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const { data: balanceData } = useBalance({
    address,
    token: USDC_ADDRESS,
  });

  const parsedAmount = parseFloat(amount) || 0;
  // Ensure we don't pass 'NaN' to parseUnits
  const amountStr = isNaN(parsedAmount) ? '0' : parsedAmount.toString();
  const amountBigInt = parseUnits(amountStr, 6);

  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, ArcSignal_ADDRESS] : undefined,
    query: {
      enabled: !!address,
    }
  });

  const needsApproval = allowanceData !== undefined && (allowanceData as bigint) < amountBigInt;

  if (!isOpen) return null;

  const isFollow = side === 0;

  // Predict payout using basic pari-mutuel math
  const newFollowPool = isFollow ? market.followPool + parsedAmount : market.followPool;
  const newFadePool = !isFollow ? market.fadePool + parsedAmount : market.fadePool;
  const winningPool = isFollow ? newFollowPool : newFadePool;
  const totalPool = newFollowPool + newFadePool;

  const poolShare = winningPool > 0 ? (parsedAmount / winningPool) * 100 : 0;
  const payout = winningPool > 0 ? (parsedAmount / winningPool) * totalPool : 0;

  const handleApprove = async () => {
    if (!walletClient || !publicClient) return;
    try {
      setIsProcessing(true);
      setError(null);
      const hash = await approveUSDC(amountBigInt, walletClient);
      await publicClient.waitForTransactionReceipt({ hash });
      await refetchAllowance();
    } catch (err: any) {
      setError(err.message || 'Approval failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStake = async () => {
    if (!walletClient || !address || !publicClient) return;
    try {
      setIsProcessing(true);
      setError(null);
      const hash = await stakeOnMarket(market.id, side, amountStr, address, walletClient);
      
      // Wait for on-chain confirmation before syncing with backend
      await publicClient.waitForTransactionReceipt({ hash });
      
      // Sync with backend
      await fetch(`/api/markets/${market.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: side === 0 ? 'follow' : 'fade',
          amount: amountStr,
          walletAddress: address,
          txHash: hash
        })
      });

      setTxHash(hash);
    } catch (err: any) {
      setError(err.message || 'Staking failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (isProcessing) return;

    // Defer reset so the user doesn't see UI flashes during close animation
    setTimeout(() => {
      setAmount('50');
      setError(null);
      setTxHash(null);
      setIsProcessing(false);
    }, 300);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020817]/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#0a1628]/95 backdrop-blur-xl border border-[#38bdf8]/20 shadow-[0_0_40px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(56,189,248,0.05)] w-full max-w-md rounded-[6px] relative overflow-hidden">
        {/* Top decorative line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#38bdf8]/50 to-transparent"></div>

        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold text-[#38bdf8] tracking-[0.1em]">
              STAKE PROTOCOL
            </span>
            <h2 className="text-xl font-bold text-white">STAKE USDC</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {txHash ? (
          /* SUCCESS STATE */
          <div className="p-8 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#34d399]/20 flex items-center justify-center mb-2">
              <div className="w-8 h-8 rounded-full bg-[#34d399] text-[#020817] flex items-center justify-center text-xl font-bold">✓</div>
            </div>
            <h3 className="text-2xl font-bold text-white">STAKE CONFIRMED</h3>
            <p className="text-sm text-gray-400">
              Your <strong className={isFollow ? "text-[#34d399]" : "text-[#f87171]"}>{isFollow ? 'FOLLOW' : 'FADE'}</strong> position has been successfully recorded on Arc Testnet.
            </p>

            <div className="bg-[#0f1f38] w-full p-4 rounded mt-4 border border-white/5 flex flex-col gap-2">
              <span className="text-[11px] text-gray-400 font-[family-name:var(--font-jetbrains-mono)]">TX HASH</span>
              <a
                href={`https://explorer.testnet.arc.network/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#38bdf8] font-[family-name:var(--font-jetbrains-mono)] text-sm break-all hover:underline"
              >
                {txHash}
              </a>
            </div>

            <button onClick={handleClose} className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded transition-colors font-[family-name:var(--font-jetbrains-mono)] text-[11px] tracking-widest">
              CLOSE
            </button>
          </div>
        ) : (
          /* INPUT STATE */
          <>
            {/* Market Info */}
            <div className="p-6 bg-[#0f1f38]/50 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm font-bold text-white mb-1 leading-tight">{market.title}</div>
                  <div className="text-xs text-gray-400">
                    {market.category === 'football' ? `${market.homeTeam} vs ${market.awayTeam}` : market.subType || market.category}
                  </div>
                </div>
                <div className={`px-3 py-1.5 text-[10px] font-bold font-[family-name:var(--font-jetbrains-mono)] tracking-widest rounded border shrink-0 ${isFollow ? 'bg-[#34d399]/20 text-[#34d399] border-[#34d399]/30' : 'bg-[#f87171]/20 text-[#f87171] border-[#f87171]/30'}`}>
                  {isFollow ? 'FOLLOW AI' : 'FADE AI'}
                </div>
              </div>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 bg-[#f87171]/10 border border-[#f87171]/30 rounded text-[#f87171] text-xs font-[family-name:var(--font-jetbrains-mono)]">
                {error}
              </div>
            )}

            {/* Input Section */}
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="text-[11px] font-[family-name:var(--font-jetbrains-mono)] tracking-widest text-gray-400">AMOUNT TO STAKE</label>
                  <div className="text-right">
                    <span className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-gray-400 block">
                      Balance: <span className="text-white">{balanceData ? Number(balanceData.formatted).toFixed(2) : '0.00'}</span> USDC
                    </span>
                  </div>
                </div>

                <div className="relative flex items-center bg-[#0f1f38] border-2 border-white/10 focus-within:border-[#38bdf8]/60 rounded p-4 pt-6 transition-all">
                  <span className="absolute top-2 left-4 text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#38bdf8]/60">USDC</span>
                  <span className="text-2xl text-[#38bdf8] mr-3 opacity-60 font-bold">&gt;</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-transparent outline-none text-3xl font-[family-name:var(--font-jetbrains-mono)] text-white placeholder:text-white/20"
                    placeholder="0.00"
                  />
                  <button
                    onClick={() => setAmount(balanceData ? balanceData.formatted : '0')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#38bdf8] bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 border border-[#38bdf8]/20 px-3 py-1.5 rounded transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs font-[family-name:var(--font-jetbrains-mono)]">
                  <span className="text-gray-400">Estimated Pool Share</span>
                  <span className="text-white">{poolShare.toFixed(2)}%</span>
                </div>
                <div className="h-px bg-white/10 w-full my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-[family-name:var(--font-jetbrains-mono)] tracking-widest text-gray-400 uppercase">Estimated Payout</span>
                  <span className="text-xl font-[family-name:var(--font-jetbrains-mono)] text-[#34d399] font-bold">
                    ~{payout.toFixed(2)} USDC
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 pt-0 space-y-3">
              {needsApproval ? (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={isProcessing || parsedAmount <= 0}
                    className="w-full bg-[#38bdf8] text-[#020817] font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold py-4 tracking-widest hover:brightness-110 rounded transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <><span className="animate-spin text-lg leading-none">↻</span> PROCESSING...</>
                    ) : (
                      'STEP 1: APPROVE USDC'
                    )}
                  </button>
                  <button
                    disabled
                    className="w-full bg-[#0f1f38] text-gray-500 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold py-4 tracking-widest rounded border border-white/5 cursor-not-allowed"
                  >
                    STEP 2: CONFIRM STAKE
                  </button>
                </>
              ) : (
                <>
                  <button
                    disabled
                    className="w-full bg-transparent text-[#38bdf8] font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold py-3 tracking-widest rounded border border-[#38bdf8]/30 flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
                  >
                    ✓ USDC APPROVED
                  </button>
                  <button
                    onClick={handleStake}
                    disabled={isProcessing || parsedAmount <= 0}
                    className="w-full bg-[#38bdf8] text-[#020817] font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold py-4 tracking-widest hover:brightness-110 rounded transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <><span className="animate-spin text-lg leading-none">↻</span> PROCESSING...</>
                    ) : (
                      'STEP 2: CONFIRM STAKE'
                    )}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
