'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import { StakeModal } from '@/components/markets/StakeModal';
import { Market, StakeSide } from '@/types';
import { useReadContract, useReadContracts, useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { formatUnits } from 'viem';
import { ArcSignal_ADDRESS } from '@/lib/usdc';
import { ARCSIGNAL_ADDRESS, ARCSIGNAL_ABI } from '@/lib/contracts';
import toast from 'react-hot-toast';
import {
  ChevronRight,
  Trophy,
  Bitcoin,
  Brain,
  FileText,
  TrendingUp,
  TrendingDown,
  Gavel,
  Activity,
  CheckCircle2,
  XCircle,
  BarChart3
} from 'lucide-react';

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
] as const;

interface MarketDetailClientProps {
  market: Market;
}

export default function MarketDetailClient({ market }: MarketDetailClientProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Read live on-chain pool data
  const { data: chainMarket } = useReadContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ArcSignal_ABI,
    functionName: 'markets',
    args: [market.marketId],
  });

  const { data: followRaw } = useReadContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'followStakes',
    args: address ? [market.marketId, address] : undefined,
    query: { enabled: !!address },
  });
  
  const { data: fadeRaw } = useReadContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'fadeStakes',
    args: address ? [market.marketId, address] : undefined,
    query: { enabled: !!address },
  });
  
  const { data: claimedRaw } = useReadContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'claimed',
    args: address ? [market.marketId, address] : undefined,
    query: { enabled: !!address },
  });

  const followPool = chainMarket ? parseFloat(formatUnits(chainMarket[3] as bigint, 6)) : market.followPool;
  const fadePool = chainMarket ? parseFloat(formatUnits(chainMarket[4] as bigint, 6)) : market.fadePool;

  const totalPool = followPool + fadePool;
  const followPercent = totalPool > 0 ? (followPool / totalPool) * 100 : 0;
  const fadePercent = totalPool > 0 ? (fadePool / totalPool) * 100 : 0;
  const rewardMulti = totalPool > 0 && followPool > 0 ? (totalPool / followPool).toFixed(2) : '—';

  const categoryLabels: string[] = market.category === 'football'
    ? ['TACTICAL ANALYSIS', 'FORM & FITNESS', 'HISTORICAL DATA', 'ODDS MOVEMENT']
    : ['ON-CHAIN METRICS', 'ORDER BOOK FLOW', 'SENTIMENT ANALYSIS', 'MACRO FACTORS'];

  const followStakeRaw = (followRaw as bigint) || 0n;
  const fadeStakeRaw = (fadeRaw as bigint) || 0n;
  const isClaimed = (claimedRaw as boolean) || false;
  const resolved = chainMarket ? chainMarket[5] : market.resolved;
  const outcome = chainMarket ? chainMarket[6] : (market.outcome === 'FOLLOW' ? 1 : market.outcome === 'FADE' ? 2 : 0);
  
  let userWon = false;
  let payout = 0;
  if (resolved) {
    if (outcome === 1 && followStakeRaw > 0n) {
      userWon = true;
      payout = Number(formatUnits(followStakeRaw, 6)) + (Number(formatUnits(followStakeRaw, 6)) * fadePool) / followPool;
    } else if (outcome === 2 && fadeStakeRaw > 0n) {
      userWon = true;
      payout = Number(formatUnits(fadeStakeRaw, 6)) + (Number(formatUnits(fadeStakeRaw, 6)) * followPool) / fadePool;
    }
  }

  const handleClaim = async () => {
    if (!walletClient || !publicClient || !address) return;
    const toastId = toast.loading('Waiting for wallet confirmation…');
    try {
      setIsClaiming(true);
      const { request } = await publicClient.simulateContract({
        account: address,
        address: ARCSIGNAL_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'claimWinnings',
        args: [market.marketId],
      });
      const hash = await walletClient.writeContract(request);
      toast.loading('Transaction submitted, confirming…', { id: toastId });
      await publicClient.waitForTransactionReceipt({ hash });
      toast.success('Winnings claimed!', { id: toastId });
      window.location.reload();
    } catch (err: any) {
      console.error('Claim failed:', err);
      toast.error('Claim failed: ' + (err?.shortMessage || err?.message || 'Unknown error'), { id: toastId });
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-on-background font-body-md selection:bg-primary selection:text-on-primary">
      <Sidebar />

      {/* Main Content Shell */}
      <main className="lg:ml-[264px] min-h-screen pt-24 pb-16 flex flex-col flex-1">
        <div className="flex flex-col lg:flex-row flex-1 px-4 lg:px-8 gap-6 w-full mx-auto">
          
          {/* Center Content */}
          <div className="flex-1 space-y-margin-desktop min-w-0">
            {/* Market Header */}
            <header className="space-y-4 pt-8 lg:pt-0">
              <nav className="flex flex-wrap items-center gap-2 font-label-caps text-text-muted">
                <Link href="/markets" className="hover:text-vibrant transition-colors">MARKETS</Link>
                <ChevronRight size={14} />
                <span className="uppercase">{market.category}</span>
                {market.league && (
                  <>
                    <ChevronRight size={14} />
                    <span className="uppercase">{market.league}</span>
                  </>
                )}
                <ChevronRight size={14} />
                <span className="text-primary truncate max-w-[200px] sm:max-w-none">{market.title}</span>
              </nav>
              
              <div className="space-y-6">
                <h2 className="font-headline-xl text-headline-xl text-vibrant max-w-4xl">
                  {market.title}
                </h2>
                
                <div className="flex flex-wrap items-center gap-8 md:gap-12">
                  <div className="space-y-1">
                    <p className="font-label-caps text-text-muted">AI PREDICTION</p>
                    <p className="font-headline-md text-tertiary flex items-center gap-2">
                      {market.agentPick.toUpperCase()} 
                      <span className="text-[10px] font-label-caps bg-tertiary/10 px-2 py-0.5 rounded border border-tertiary/20">
                        {market.agentPick.toLowerCase().includes('yes') || market.agentPick.toLowerCase().includes('follow') ? 'BULLISH' : 'BEARISH'}
                      </span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-label-caps text-text-muted">PROBABILITY</p>
                    <p className="font-headline-md font-code-sm text-vibrant">{market.probability ?? '—'}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-label-caps text-text-muted">AI CONFIDENCE</p>
                    <p className="font-headline-md font-code-sm text-primary">{market.confidence}%</p>
                  </div>
                </div>
              </div>
            </header>

            {/* Bento Grid Content */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
              {/* AI Summary */}
              {market.summary && (
                <div className="col-span-1 md:col-span-12 bg-surface-charcoal border border-border-subtle p-6 rounded-lg relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Brain className="w-24 h-24" />
                  </div>
                  <h3 className="font-label-caps text-primary mb-4 flex items-center gap-2">
                    <FileText size={16} /> SUMMARIZE
                  </h3>
                  <p className="font-body-lg text-on-surface-variant leading-relaxed max-w-3xl relative z-10">
                    {market.summary}
                  </p>
                </div>
              )}

              {/* Bull/Bear Cases */}
              {(market.bull_case || market.bear_case) && (
                <>
                  {market.bull_case && (
                    <div className="col-span-1 md:col-span-6 bg-surface-charcoal border border-border-subtle p-6 rounded-lg">
                      <h3 className="font-label-caps text-tertiary mb-4 flex items-center gap-2">
                        <TrendingUp size={16} /> BULL CASE
                      </h3>
                      <p className="text-on-surface-variant font-body-md">
                        {market.bull_case}
                      </p>
                    </div>
                  )}
                  {market.bear_case && (
                    <div className="col-span-1 md:col-span-6 bg-surface-charcoal border border-border-subtle p-6 rounded-lg">
                      <h3 className="font-label-caps text-error mb-4 flex items-center gap-2">
                        <TrendingDown size={16} /> BEAR CASE
                      </h3>
                      <p className="text-on-surface-variant font-body-md">
                        {market.bear_case}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Key Factors */}
              {market.keyFactors && market.keyFactors.length > 0 && (
                <div className="col-span-1 md:col-span-12 space-y-4">
                  <h3 className="font-label-caps text-text-muted flex items-center gap-2">
                    PSYCHOLOGY: KEY FACTORS
                  </h3>
                  <div className="space-y-base">
                    {market.keyFactors.map((factor, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-background border border-border-subtle rounded hover:border-primary transition-colors gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <span className="font-label-caps text-[10px] bg-secondary-container/20 text-secondary px-2 py-1 rounded w-fit">
                            {categoryLabels[i] || `FACTOR ${i + 1}`}
                          </span>
                          <span className="text-on-surface">{factor}</span>
                        </div>
                        <span className="font-code-sm text-tertiary shrink-0">STRENGTH: HIGH</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Sources & Rules */}
              <div className="col-span-1 md:col-span-4 space-y-4">
                <h3 className="font-label-caps text-text-muted">DATA SOURCES</h3>
                <div className="flex flex-wrap gap-2">
                  {market.data_sources && market.data_sources.length > 0 ? (
                    market.data_sources.map((src, i) => (
                      <span key={i} className="bg-surface-container-high px-3 py-1.5 rounded font-label-caps text-[11px] border border-outline-variant">
                        {src}
                      </span>
                    ))
                  ) : (
                    <span className="bg-surface-container-high px-3 py-1.5 rounded font-label-caps text-[11px] border border-outline-variant">
                      ON-CHAIN ORACLES
                    </span>
                  )}
                </div>
              </div>
              <div className="col-span-1 md:col-span-8 space-y-4">
                <h3 className="font-label-caps text-text-muted flex items-center gap-2">
                  GAVEL: RESOLUTION RULES
                </h3>
                <div className="bg-background-deep p-4 border border-outline-variant rounded italic text-text-muted text-sm leading-relaxed">
                  &quot;{market.category === 'crypto'
                    ? `This market resolves based on the verified price from CoinGecko at the resolution timestamp. If the AI prediction is correct, FOLLOW wins. If incorrect, FADE wins. Settlement occurs T+1 hour after timestamp.`
                    : `This market resolves based on the official match result. If the AI prediction (${market.agentPick}) is correct, FOLLOW wins. If incorrect, FADE wins.`}&quot;
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Trading Panel */}
          <aside className="w-full lg:w-[380px] space-y-gutter shrink-0">
            {/* Confidence Meter */}
            <div className="bg-surface-charcoal border border-border-subtle p-6 rounded-lg space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="font-label-caps text-text-muted">AI CONFIDENCE</h3>
                  <p className="text-headline-md font-code-sm text-tertiary">{market.confidence}%</p>
                </div>
                <p className="font-label-caps text-[10px] text-text-muted mb-1">SIGNAL STRENGTH</p>
              </div>
              <div className="h-1 bg-background-deep rounded-full overflow-hidden">
                <div className="h-full bg-tertiary shadow-[0_0_10px_rgba(79,219,200,0.5)] transition-all duration-1000" style={{ width: `${market.confidence}%` }}></div>
              </div>
              <p className="text-[11px] text-text-muted font-body-md">Independent of pool liquidity. Calculated via transformer-based predictive neural model.</p>
            </div>

            {/* Live Pool */}
            <div className="bg-surface-charcoal border border-border-subtle p-6 rounded-lg space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-label-caps text-text-muted">LIVE POOL</h3>
                <div className="flex gap-4 font-code-sm text-[11px]">
                  <span className="text-tertiary">FOLLOW {followPercent.toFixed(0)}%</span>
                  <span className="text-error">FADE {fadePercent.toFixed(0)}%</span>
                </div>
              </div>
              
              {totalPool === 0 ? (
                <div className="flex h-3 rounded-full overflow-hidden bg-background-deep items-center justify-center">
                  <span className="text-[8px] font-label-caps text-text-muted">NO LIQUIDITY</span>
                </div>
              ) : (
                <div className="flex h-3 rounded-full overflow-hidden">
                  <div className="h-full bg-tertiary transition-all duration-1000" style={{ width: `${followPercent}%` }}></div>
                  <div className="h-full bg-error transition-all duration-1000" style={{ width: `${fadePercent}%` }}></div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-base">
                <div className="bg-background p-4 border border-border-subtle rounded text-center">
                  <p className="font-label-caps text-[10px] text-text-muted mb-1">PARTICIPANTS</p>
                  <p className="font-headline-md font-code-sm text-vibrant">{market.participants ?? '—'}</p>
                </div>
                <div className="bg-background p-4 border border-border-subtle rounded text-center">
                  <p className="font-label-caps text-[10px] text-text-muted mb-1">REWARD MULTI</p>
                  <p className="font-headline-md font-code-sm text-secondary">{rewardMulti}x</p>
                </div>
              </div>
            </div>

            {/* Execute Trade / Claim */}
            <div className="bg-surface-charcoal border border-border-subtle p-6 rounded-lg space-y-6">
              <h3 className="font-label-caps text-text-muted">{resolved ? 'MARKET RESOLVED' : 'EXECUTE TRADE'}</h3>
              
              {!resolved ? (
                <>
                  <p className="text-xs text-text-muted">
                    AI predicts <span className="text-tertiary font-bold">{market.agentPick.toUpperCase()}</span>. Agree? FOLLOW. Disagree? FADE.
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => setStakeModalSide(0)}
                      className="w-full group relative flex items-center justify-center gap-3 py-4 bg-transparent border-2 border-tertiary text-tertiary font-bold font-label-caps rounded-lg overflow-hidden transition-all hover:bg-tertiary hover:text-background active:scale-[0.98]"
                    >
                      <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" />
                      FOLLOW AI
                      <div className="absolute inset-0 bg-tertiary opacity-0 group-hover:opacity-10 pointer-events-none"></div>
                    </button>
                    <button
                      onClick={() => setStakeModalSide(1)}
                      className="w-full group relative flex items-center justify-center gap-3 py-4 bg-transparent border-2 border-error text-error font-bold font-label-caps rounded-lg overflow-hidden transition-all hover:bg-error hover:text-background active:scale-[0.98]"
                    >
                      <XCircle size={20} className="group-hover:scale-110 transition-transform" />
                      FADE AI
                      <div className="absolute inset-0 bg-error opacity-0 group-hover:opacity-10 pointer-events-none"></div>
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-background-deep p-4 rounded border border-border-subtle">
                     <Gavel size={20} className="text-secondary" />
                     <div>
                       <p className="text-xs text-text-muted font-label-caps">Outcome</p>
                       <p className={`font-bold ${outcome === 1 ? 'text-tertiary' : outcome === 2 ? 'text-error' : 'text-on-surface'}`}>
                         {outcome === 1 ? 'FOLLOW WON' : outcome === 2 ? 'FADE WON' : 'CANCELLED/DRAW'}
                       </p>
                     </div>
                  </div>
                  
                  {userWon && !isClaimed && (
                    <button
                      onClick={handleClaim}
                      disabled={isClaiming}
                      className="w-full py-4 rounded-lg font-bold font-label-caps tracking-widest transition-all disabled:opacity-50"
                      style={{
                        background: isClaiming ? '#1c1b1b' : 'linear-gradient(135deg, #a855f7, #34d399)',
                        color: 'white',
                        boxShadow: isClaiming ? 'none' : '0 0 20px rgba(168,85,247,0.3)',
                      }}
                    >
                      {isClaiming ? 'Claiming...' : `Claim Winnings (${payout.toFixed(2)} USDC)`}
                    </button>
                  )}
                  {userWon && isClaimed && (
                    <div className="w-full py-4 rounded-lg bg-tertiary/10 border border-tertiary/30 text-tertiary text-center font-bold font-label-caps">
                      Winnings Claimed
                    </div>
                  )}
                  {!userWon && (followStakeRaw > 0n || fadeStakeRaw > 0n) && (
                    <div className="w-full py-4 rounded-lg bg-error/10 border border-error/30 text-error text-center font-bold font-label-caps">
                      Position Lost
                    </div>
                  )}
                  {followStakeRaw === 0n && fadeStakeRaw === 0n && (
                    <div className="w-full py-4 rounded-lg bg-background border border-border-subtle text-text-muted text-center font-bold font-label-caps text-xs">
                      No Position
                    </div>
                  )}
                </div>
              )}
              
              <div className="pt-4 border-t border-border-subtle">
                <div className="flex justify-between font-label-caps text-[10px] text-text-muted">
                  <span>PLATFORM FEE</span>
                  <span>0.5%</span>
                </div>
              </div>
            </div>

            {/* Mini Chart / Visualizer Placeholder */}
            <div className="h-48 rounded-lg border border-border-subtle bg-background-deep relative overflow-hidden flex items-center justify-center group">
              <BarChart3 className="w-12 h-12 text-primary/10 group-hover:text-primary/20 transition-colors" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="font-label-caps text-[10px] text-primary/50">REAL-TIME SIGNAL STREAM</span>
              </div>
            </div>
            
          </aside>
        </div>
      </main>

      {stakeModalSide !== null && (
        <StakeModal
          market={market}
          side={stakeModalSide}
          isOpen={true}
          onClose={() => setStakeModalSide(null)}
        />
      )}
    </div>
  );
}
