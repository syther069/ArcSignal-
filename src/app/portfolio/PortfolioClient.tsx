'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useAccount, useReadContracts, useWalletClient, usePublicClient } from 'wagmi';
import { ARCSIGNAL_ADDRESS, ARCSIGNAL_ABI } from '@/lib/contracts';
import { Badge } from '@/components/ui/Badge';
import { formatUnits, parseAbiItem } from 'viem';

export default function PortfolioClient() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  const [stakes, setStakes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<Record<string, boolean>>({});

  const fetchPortfolio = async () => {
    if (!address || !publicClient) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    try {
      const currentBlock = await publicClient.getBlockNumber();
      const DEPLOYMENT_BLOCK = 50012000n;
      
      let fromBlock = DEPLOYMENT_BLOCK;
      let allLogs: any[] = [];

      while (fromBlock <= currentBlock) {
        let toBlock = fromBlock + 9999n;
        if (toBlock > currentBlock) {
          toBlock = currentBlock;
        }
        const logs = await publicClient.getLogs({
          address: ARCSIGNAL_ADDRESS,
          event: parseAbiItem('event Staked(string marketId, address user, uint8 side, uint256 amount)'),
          fromBlock,
          toBlock
        });
        allLogs.push(...logs);
        fromBlock = toBlock + 1n;
      }

      const userStakes = allLogs
        .filter((log: any) => log.args.user?.toLowerCase() === address.toLowerCase())
        .map((log: any) => ({
          id: log.transactionHash + '-' + log.logIndex,
          marketId: log.args.marketId,
          side: log.args.side,
          amountUsdc: log.args.amount || 0n,
          markets: {
            title: 'Loading...',
            category: 'crypto'
          },
          createdAt: new Date().toISOString()
        }));

      // Group by marketId and side
      const grouped: Record<string, any> = {};
      for (const s of userStakes) {
        const key = s.marketId + '-' + s.side;
        if (!grouped[key]) {
          grouped[key] = { ...s };
        } else {
          grouped[key].amountUsdc = grouped[key].amountUsdc + s.amountUsdc;
        }
      }
      
      const finalStakes = Object.values(grouped).map(s => ({
        ...s,
        amountUsdc: formatUnits(s.amountUsdc, 6)
      }));
      
      finalStakes.reverse();
      setStakes(finalStakes);
    } catch (err) {
      console.error("Failed to fetch stakes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, [address, publicClient]);

  const contractsToRead = stakes.flatMap(stake => [
    {
      address: ARCSIGNAL_ADDRESS,
      abi: ARCSIGNAL_ABI,
      functionName: 'getMarket',
      args: [stake.marketId],
    },
    {
      address: ARCSIGNAL_ADDRESS,
      abi: ARCSIGNAL_ABI,
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
        address: ARCSIGNAL_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'claimWinnings',
        args: [marketId],
      });
      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      await refetchChainData();
    } catch (err: any) {
      console.error('Claim failed:', err);
      alert('Claim failed: ' + (err.shortMessage || err.message));
    } finally {
      setClaiming(prev => ({ ...prev, [marketId]: false }));
    }
  };

  return (
    <div className="flex min-h-screen bg-[#131313] text-[#e5e2e1]">
      <Sidebar />
      <main className="lg:ml-[264px] pt-24 px-6 md:px-8 pb-16 flex-1 min-w-0">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-[family-name:var(--font-hanken)] text-3xl font-bold text-white mb-2">Portfolio</h1>
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-sm text-[#94a3b8] tracking-widest uppercase">On-Chain Positions</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-16">
            <div className="flex flex-col items-center gap-4">
              <span className="w-8 h-8 rounded-full border-2 border-[#ddb7ff] border-t-transparent animate-spin"></span>
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#94a3b8] uppercase tracking-widest">Fetching positions...</span>
            </div>
          </div>
        ) : !address ? (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-12 text-center">
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-sm text-[#94a3b8] tracking-widest">Please connect wallet to view portfolio</p>
          </div>
        ) : stakes.length === 0 ? (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-12 text-center">
            <p className="font-[family-name:var(--font-hanken)] text-lg text-[#94a3b8] mb-2">No open positions</p>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#94a3b8]/60">Stake on a market to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {stakes.map((stake, i) => {
              const marketObj = chainData?.[i * 2]?.result as any;
              const isClaimed = chainData?.[i * 2 + 1]?.result as boolean;
              
              const isResolved = marketObj ? marketObj.resolved : false;
              // Contract: outcome 0 = FOLLOW wins, outcome 1 = FADE wins
              const outcome = marketObj ? marketObj.outcome : -1;
              const sideText = stake.side === 0 ? 'FOLLOW' : 'FADE';
              const isFollow = stake.side === 0;
              
              // Win: user's side (0=FOLLOW, 1=FADE) matches outcome (0=FOLLOW wins, 1=FADE wins)
              const userWon = isResolved && outcome === stake.side;
              const userLost = isResolved && outcome !== stake.side;

              // AI always picks FOLLOW (side 0), so AI is correct when outcome is 0
              const aiCorrect = isResolved && outcome === 0;

              let payoutAmount = 0;
              if (userWon && marketObj) {
                const followPool = parseFloat(formatUnits(marketObj.followPool, 6));
                const fadePool = parseFloat(formatUnits(marketObj.fadePool, 6));
                const winningPool = stake.side === 0 ? followPool : fadePool;
                const totalPool = followPool + fadePool;
                payoutAmount = winningPool > 0 ? (Number(stake.amountUsdc) / winningPool) * totalPool : 0;
              }

              return (
                <div
                  key={stake.id}
                  className={`bg-[#0f172a] border rounded-xl p-5 flex flex-col gap-4 transition-all ${
                    userWon && !isClaimed
                      ? 'border-[#4fdbc8]/40 shadow-[0_0_20px_rgba(79,219,200,0.05)]'
                      : userLost
                      ? 'border-[#1e293b]'
                      : 'border-[#1e293b]'
                  }`}
                >
                  {/* Top: Market info */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant={marketObj?.category?.toLowerCase() || 'crypto'} label={marketObj?.category || 'MARKET'} />
                        {isResolved ? (
                          <Badge variant="resolved" label="RESOLVED" />
                        ) : (
                          <span className="bg-[#4fdbc8]/10 text-[#4fdbc8] px-2 py-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] rounded tracking-widest border border-[#4fdbc8]/20 animate-pulse">LIVE</span>
                        )}
                        {isResolved && (
                          <span className={`px-2 py-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] rounded border tracking-widest ${
                            aiCorrect
                              ? 'bg-[#ddb7ff]/10 text-[#ddb7ff] border-[#ddb7ff]/20'
                              : 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/20'
                          }`}>
                            AI {aiCorrect ? '✓ CORRECT' : '✗ WRONG'}
                          </span>
                        )}
                      </div>
                      <h3 className="font-[family-name:var(--font-hanken)] font-bold text-white text-base leading-snug mb-1">
                        {marketObj?.question || stake.marketId}
                      </h3>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-[#131313] border border-[#1e293b] rounded-lg p-3">
                      <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[#94a3b8] uppercase tracking-widest mb-1">Position</p>
                      <p className={`font-[family-name:var(--font-jetbrains-mono)] font-bold text-sm ${isFollow ? 'text-[#4fdbc8]' : 'text-[#ffb4ab]'}`}>
                        {sideText}
                      </p>
                    </div>
                    <div className="bg-[#131313] border border-[#1e293b] rounded-lg p-3">
                      <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[#94a3b8] uppercase tracking-widest mb-1">Staked</p>
                      <p className="font-[family-name:var(--font-jetbrains-mono)] font-bold text-sm text-white">
                        {Number(stake.amountUsdc).toFixed(2)} <span className="text-[#94a3b8] text-xs">USDC</span>
                      </p>
                    </div>
                    <div className="bg-[#131313] border border-[#1e293b] rounded-lg p-3">
                      <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[#94a3b8] uppercase tracking-widest mb-1">Outcome</p>
                      {!isResolved ? (
                        <p className="font-[family-name:var(--font-jetbrains-mono)] font-bold text-sm text-[#94a3b8]">PENDING</p>
                      ) : userWon ? (
                        <p className="font-[family-name:var(--font-jetbrains-mono)] font-bold text-sm text-[#4fdbc8]">WON</p>
                      ) : (
                        <p className="font-[family-name:var(--font-jetbrains-mono)] font-bold text-sm text-[#ffb4ab]">LOST</p>
                      )}
                    </div>
                    <div className="bg-[#131313] border border-[#1e293b] rounded-lg p-3">
                      <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[#94a3b8] uppercase tracking-widest mb-1">
                        {userWon ? 'Payout' : 'P&L'}
                      </p>
                      {!isResolved ? (
                        <p className="font-[family-name:var(--font-jetbrains-mono)] font-bold text-sm text-[#94a3b8]">—</p>
                      ) : userWon ? (
                        <p className="font-[family-name:var(--font-jetbrains-mono)] font-bold text-sm text-[#4fdbc8]">
                          +{payoutAmount.toFixed(2)} <span className="text-xs">USDC</span>
                        </p>
                      ) : (
                        <p className="font-[family-name:var(--font-jetbrains-mono)] font-bold text-sm text-[#ffb4ab]">
                          -{Number(stake.amountUsdc).toFixed(2)} <span className="text-xs">USDC</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Claim / Claimed */}
                  {userWon && !isClaimed && (
                    <button
                      onClick={() => handleClaim(stake.marketId)}
                      disabled={claiming[stake.marketId]}
                      className="w-full md:w-auto self-end px-6 py-3 bg-[#4fdbc8]/15 hover:bg-[#4fdbc8]/25 text-[#4fdbc8] font-[family-name:var(--font-jetbrains-mono)] text-sm font-bold tracking-widest rounded-lg border border-[#4fdbc8]/40 transition-all flex items-center justify-center gap-2"
                    >
                      {claiming[stake.marketId] ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-[#4fdbc8] border-t-transparent animate-spin"></span>
                          CLAIMING...
                        </>
                      ) : (
                        <>
                          ↑ CLAIM {payoutAmount.toFixed(2)} USDC
                        </>
                      )}
                    </button>
                  )}
                  {userWon && isClaimed && (
                    <div className="w-full md:w-auto self-end px-6 py-3 bg-transparent text-[#94a3b8] font-[family-name:var(--font-jetbrains-mono)] text-sm font-bold tracking-widest rounded-lg border border-[#1e293b] flex items-center justify-center gap-2">
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
