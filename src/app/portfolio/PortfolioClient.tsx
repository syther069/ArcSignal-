'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useAccount, useReadContracts, useWalletClient, usePublicClient } from 'wagmi';
import { ArcSignal_ADDRESS } from '@/lib/usdc';
import { Badge } from '@/components/ui/Badge';
import { formatUnits } from 'viem';

const ArcSignal_ABI = [
  {
    type: 'function',
    name: 'markets',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'string' }],
    outputs: [
      { name: 'marketId', type: 'string' },
      { name: 'category', type: 'string' },
      { name: 'resolutionTime', type: 'uint256' },
      { name: 'followPool', type: 'uint256' },
      { name: 'fadePool', type: 'uint256' },
      { name: 'resolved', type: 'bool' },
      { name: 'outcome', type: 'uint8' },
    ],
  },
  {
    type: 'function',
    name: 'claimed',
    stateMutability: 'view',
    inputs: [
      { name: 'marketId', type: 'string' },
      { name: 'user', type: 'address' }
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'claimWinnings',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'marketId', type: 'string' }],
    outputs: [],
  }
] as const;

export default function PortfolioClient() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  const [stakes, setStakes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<Record<string, boolean>>({});

  const fetchPortfolio = async () => {
    if (!address) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    setStakes([]);
    setLoading(false);
  };

  useEffect(() => {
    fetchPortfolio();
  }, [address]);

  // Multicall to get live on-chain status for each market
  const contractsToRead = stakes.flatMap(stake => [
    {
      address: ArcSignal_ADDRESS,
      abi: ArcSignal_ABI,
      functionName: 'markets',
      args: [stake.marketId],
    },
    {
      address: ArcSignal_ADDRESS,
      abi: ArcSignal_ABI,
      functionName: 'claimed',
      args: [stake.marketId, address as `0x${string}`],
    }
  ]);

  const { data: chainData, refetch: refetchChainData } = useReadContracts({
    contracts: contractsToRead as any,
    query: {
      enabled: stakes.length > 0 && !!address,
    }
  });

  const handleClaim = async (marketId: string) => {
    if (!walletClient || !publicClient) return;
    try {
      setClaiming(prev => ({ ...prev, [marketId]: true }));
      const { request } = await publicClient.simulateContract({
        account: address as `0x${string}`,
        address: ArcSignal_ADDRESS,
        abi: ArcSignal_ABI,
        functionName: 'claimWinnings',
        args: [marketId],
      });
      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      
      // Refresh state
      await refetchChainData();
    } catch (err: any) {
      console.error('Claim failed:', err);
      alert('Claim failed: ' + (err.shortMessage || err.message));
    } finally {
      setClaiming(prev => ({ ...prev, [marketId]: false }));
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="lg:ml-[264px] pt-24 px-6 md:px-8 pb-16 flex-1 min-w-0">
        <h1 className="text-3xl font-bold text-white mb-2">PORTFOLIO</h1>
        <p className="font-mono text-sm text-slate-400 mb-8 tracking-widest">ON-CHAIN POSITIONS</p>

        {loading ? (
          <div className="text-center p-12"><span className="animate-spin inline-block text-2xl text-[#38bdf8]">↻</span></div>
        ) : !address ? (
          <div className="glass-card p-12 text-center text-slate-400 font-mono">PLEASE CONNECT WALLET TO VIEW PORTFOLIO</div>
        ) : stakes.length === 0 ? (
          <div className="glass-card p-12 text-center text-slate-400 font-mono">NO OPEN POSITIONS</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {stakes.map((stake, i) => {
              const marketObj = chainData?.[i * 2]?.result as any;
              const isClaimed = chainData?.[i * 2 + 1]?.result as boolean;
              
              const isResolved = marketObj ? marketObj[5] : stake.markets?.resolved;
              const outcome = marketObj ? marketObj[6] : 0;
              const sideText = stake.side === 0 ? 'FOLLOW' : 'FADE';
              const isFollow = stake.side === 0;
              
              const userWon = isResolved && outcome === stake.side;
              const userLost = isResolved && outcome !== stake.side;

              let payoutAmount = 0;
              if (userWon && marketObj) {
                const followPool = parseFloat(formatUnits(marketObj[3], 6));
                const fadePool = parseFloat(formatUnits(marketObj[4], 6));
                const winningPool = stake.side === 0 ? followPool : fadePool;
                const totalPool = followPool + fadePool;
                payoutAmount = winningPool > 0 ? (Number(stake.amountUsdc) / winningPool) * totalPool : 0;
              }

              return (
                <div key={stake.id} className="glass-card p-5 border-white/5 bg-[#101416]/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={stake.markets?.category || 'crypto'} label={stake.markets?.category || 'MARKET'} />
                      {isResolved ? (
                        <Badge variant="resolved" label="RESOLVED" />
                      ) : (
                        <span className="bg-[#38bdf8]/10 text-[#38bdf8] px-2 py-0.5 font-mono text-[10px] rounded tracking-widest border border-[#38bdf8]/20 animate-pulse">LIVE</span>
                      )}
                    </div>
                    <h3 className="font-bold text-white text-lg leading-tight mb-1">{stake.markets?.title}</h3>
                    <p className="font-mono text-xs text-slate-500">Staked on: {new Date(stake.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="flex items-center gap-6 md:gap-12 bg-white/[0.02] p-4 rounded border border-white/5">
                    <div className="flex flex-col items-center">
                      <span className="font-mono text-[10px] text-slate-500 tracking-widest mb-1">POSITION</span>
                      <span className={`font-mono font-bold tracking-widest ${isFollow ? 'text-[#34d399]' : 'text-[#f87171]'}`}>{sideText}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="font-mono text-[10px] text-slate-500 tracking-widest mb-1">STAKED</span>
                      <span className="font-mono font-bold text-white">{Number(stake.amountUsdc).toFixed(2)} USDC</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="font-mono text-[10px] text-slate-500 tracking-widest mb-1">STATUS</span>
                      {!isResolved ? (
                        <span className="font-mono font-bold text-slate-400">PENDING</span>
                      ) : userWon ? (
                        <span className="font-mono font-bold text-[#34d399]">WON {payoutAmount.toFixed(2)} USDC</span>
                      ) : (
                        <span className="font-mono font-bold text-[#f87171]">LOST</span>
                      )}
                    </div>
                  </div>

                  {userWon && !isClaimed && (
                    <button
                      onClick={() => handleClaim(stake.marketId)}
                      disabled={claiming[stake.marketId]}
                      className="px-6 py-4 bg-[#34d399]/20 hover:bg-[#34d399]/30 text-[#34d399] font-mono text-sm font-bold tracking-widest rounded border border-[#34d399]/30 transition-all flex items-center justify-center min-w-[140px]"
                    >
                      {claiming[stake.marketId] ? 'CLAIMING...' : 'CLAIM REWARD'}
                    </button>
                  )}
                  {userWon && isClaimed && (
                    <div className="px-6 py-4 bg-transparent text-slate-500 font-mono text-sm font-bold tracking-widest rounded border border-white/10 flex items-center justify-center min-w-[140px]">
                      ✓ CLAIMED
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
