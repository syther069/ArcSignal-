'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from 'wagmi';
import { type Address } from 'viem';
import {
  Wallet,
  TrendingUp,
  Trophy,
  Copy,
  Check,
  Camera,
  Pencil,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Share,
} from 'lucide-react';
import ConnectWalletButton from '@/components/wallet/ConnectWalletButton';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import { Stake } from '@/types';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg:           '#080A0C',
  surface:      '#111416',
  surfaceLow:   '#1a1c1e',
  surfaceHigh:  '#282a2c',
  primary:      '#c0c1ff', // text-primary
  secondary:    '#b9c8de',
  tertiary:     '#4edea3', // text-tertiary
  onSurface:    '#e2e2e5',
  onSurfaceVar: '#c7c4d7',
  error:        '#ffb4ab', // text-error
  border:       'rgba(255,255,255,0.08)',
} as const;

const glass: React.CSSProperties = {
  background:     'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(30px)',
  border:         `1px solid ${C.border}`,
};

function fmt(address?: string) {
  if (!address) return '—';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ProfileClientProps {
  walletAddress?: string;
  isPublic?: boolean;
}

export default function ProfileClient({ walletAddress, isPublic = false }: ProfileClientProps) {
  const { address: connectedAddress, isConnected } = useAccount();
  const publicClient = usePublicClient();
  
  // The address we are viewing
  const targetAddress = (isPublic ? walletAddress : connectedAddress) as Address | undefined;
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ─── Profile Data from Contract ─────────────────────────────────────────────
  const { data: profileData, refetch: refetchProfile } = useReadContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'getProfile',
    args: targetAddress ? [targetAddress] : undefined,
    query: { enabled: !!targetAddress },
  });

  const username = profileData?.username || '';
  const bio = profileData?.bio || '';
  const avatarUrl = profileData?.avatarUrl || '';

  // ─── Position Data from Contract ────────────────────────────────────────────
  const [stakes, setStakes] = useState<Stake[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(true);

  useEffect(() => {
    async function loadPositions() {
      if (!targetAddress || !publicClient) return;
      setLoadingPositions(true);
      try {
        const logs = await publicClient.getLogs({
          address: ARCSIGNAL_ADDRESS,
          event: ARCSIGNAL_ABI.find(x => x.type === 'event' && x.name === 'Staked') as any,
          args: { user: targetAddress },
          fromBlock: 0n,
        });

        // Multicall to get market details
        const uniqueMarketIds = Array.from(new Set(logs.map((l: any) => l.args.marketId!)));
        
        const marketData = await publicClient.multicall({
          contracts: uniqueMarketIds.map(id => ({
            address: ARCSIGNAL_ADDRESS,
            abi: ARCSIGNAL_ABI,
            functionName: 'getMarket',
            args: [id],
          })),
        });

        const marketMap = new Map();
        uniqueMarketIds.forEach((id, i) => {
          if (marketData[i].status === 'success') {
            marketMap.set(id, marketData[i].result);
          }
        });

        // Reconstruct Stake objects
        const resolvedStakes = logs.map((log: any) => {
          const m = marketMap.get(log.args.marketId!);
          let pnl: number | undefined = undefined;
          
          if (m && m[7]) { // resolved
            const outcome = m[8]; // 1 = follow wins, 2 = fade wins
            const userSide = log.args.side; // 0 = follow, 1 = fade
            
            // Map outcome back to userSide equivalent (outcome 1 => side 0, outcome 2 => side 1)
            const winningSide = outcome === 1 ? 0 : 1;
            const isWin = userSide === winningSide;
            
            const amt = Number(log.args.amount) / 1e18; // assuming USDC 18 dec for arc testnet
            if (isWin) {
              const winPool = winningSide === 0 ? m[5] : m[6];
              const losePool = winningSide === 0 ? m[6] : m[5];
              const wp = Number(winPool) / 1e18;
              const lp = Number(losePool) / 1e18;
              pnl = amt + (amt * lp / wp) - amt; // net profit
            } else {
              pnl = -amt;
            }
          }

          return {
            id: log.transactionHash,
            walletAddress: targetAddress,
            txHash: log.transactionHash,
            createdAt: new Date().toISOString(),
            marketId: log.args.marketId!,
            side: log.args.side!,
            amountUsdc: Number(log.args.amount) / 1e18,
            timestamp: new Date().toISOString(), // we don't have block timestamp easily here without extra calls
            pnl,
          } as unknown as Stake;
        });

        setStakes(resolvedStakes.reverse()); // newest first
      } catch (err) {
        console.error(err);
      }
      setLoadingPositions(false);
    }
    loadPositions();
  }, [targetAddress, publicClient]);

  // ─── Stats Derivation ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalStaked = 0;
    let netProfit = 0;
    let wins = 0;
    let resolvedCount = 0;

    stakes.forEach(s => {
      totalStaked += s.amountUsdc;
      if (s.pnl !== undefined) {
        resolvedCount++;
        netProfit += s.pnl;
        if (s.pnl > 0) wins++;
      }
    });

    return {
      totalStaked,
      netProfit,
      winRate: resolvedCount > 0 ? (wins / resolvedCount) * 100 : 0,
      marketsEntered: stakes.length,
    };
  }, [stakes]);

  // ─── UI State ───────────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);
  const copyAddress = () => {
    if (targetAddress) {
      navigator.clipboard.writeText(targetAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const [activeTab, setActiveTab] = useState<'overview'|'positions'|'achievements'>('overview');
  
  // ─── Edit Modal ─────────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', bio: '', avatarUrl: '' });

  const { writeContractAsync, isPending: isSaving } = useWriteContract();

  const handleEditClick = () => {
    setEditForm({ username, bio, avatarUrl });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!targetAddress) return;
    try {
      const tx = await writeContractAsync({
        address: ARCSIGNAL_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'setProfile',
        args: [editForm.username, editForm.bio, editForm.avatarUrl],
      });
      setIsEditing(false);
      refetchProfile();
    } catch (e) {
      console.error('Failed to save profile', e);
    }
  };

  if (!mounted) return null;

  if (!targetAddress) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-headline-xl text-primary mb-4">Connect Wallet</h1>
        <p className="text-text-muted mb-8 max-w-md mx-auto">
          Please connect your wallet to view your profile.
        </p>
        <ConnectWalletButton />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-6 max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
      
      {/* ─── LEFT COLUMN: IDENTITY ─── */}
      <aside className="w-full md:w-80 flex-shrink-0 flex flex-col gap-6">
        <div className="bg-surface-charcoal border border-border-subtle rounded-2xl p-6 text-center">
          
          <div className="w-32 h-32 mx-auto rounded-full mb-4 overflow-hidden bg-surface-base border border-border-subtle flex items-center justify-center relative group">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl text-primary font-headline-xl">{targetAddress.slice(2, 4).toUpperCase()}</span>
            )}
          </div>
          
          <h1 className="text-2xl font-headline-lg text-primary mb-1">
            {username || 'Anonymous User'}
          </h1>
          
          <div className="flex items-center justify-center gap-2 mb-4 text-text-muted">
            <Wallet size={14} />
            <span className="font-code-sm">{fmt(targetAddress)}</span>
            <button onClick={copyAddress} className="hover:text-primary transition-colors">
              {copied ? <Check size={14} className="text-tertiary" /> : <Copy size={14} />}
            </button>
          </div>
          
          {bio && <p className="text-sm text-text-muted mb-6 leading-relaxed">{bio}</p>}
          
          {!isPublic && (
            <button
              onClick={handleEditClick}
              className="w-full py-2.5 rounded-lg border border-border-subtle hover:bg-white/5 transition-colors text-sm font-label-caps"
            >
              EDIT PROFILE
            </button>
          )}

          {isPublic && (
            <button className="w-full py-2.5 rounded-lg bg-primary text-black font-label-caps hover:opacity-90 transition-opacity">
              FOLLOW OPERATOR
            </button>
          )}

          <div className="mt-6 flex flex-col gap-2 border-t border-border-subtle pt-6 text-left">
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-muted">Win Rate</span>
              <span className="font-code-sm text-tertiary">{stats.winRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-muted">Net P&L</span>
              <span className={`font-code-sm ${stats.netProfit >= 0 ? 'text-tertiary' : 'text-error'}`}>
                {stats.netProfit >= 0 ? '+' : ''}{stats.netProfit.toFixed(2)} USDC
              </span>
            </div>
          </div>

        </div>
      </aside>

      {/* ─── RIGHT COLUMN: CONTENT ─── */}
      <main className="flex-1 flex flex-col gap-6">
        
        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-border-subtle pb-4">
          {['overview', 'positions', 'achievements'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`text-sm font-label-caps tracking-wider transition-colors pb-4 -mb-[17px] ${
                activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-white'
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             <div className="bg-surface-charcoal border border-border-subtle rounded-xl p-6">
                <p className="text-text-muted text-xs font-label-caps mb-2">Total Staked</p>
                <p className="text-2xl font-code-sm">{stats.totalStaked.toLocaleString(undefined, {maximumFractionDigits:2})} USDC</p>
             </div>
             <div className="bg-surface-charcoal border border-border-subtle rounded-xl p-6 border-t-2 border-t-tertiary">
                <p className="text-text-muted text-xs font-label-caps mb-2">Total P&L</p>
                <p className={`text-2xl font-code-sm ${stats.netProfit >= 0 ? 'text-tertiary' : 'text-error'}`}>
                  {stats.netProfit >= 0 ? '+' : ''}{stats.netProfit.toLocaleString(undefined, {maximumFractionDigits:2})} USDC
                </p>
             </div>
             <div className="bg-surface-charcoal border border-border-subtle rounded-xl p-6">
                <p className="text-text-muted text-xs font-label-caps mb-2">Markets Entered</p>
                <p className="text-2xl font-code-sm text-primary">{stats.marketsEntered}</p>
             </div>
          </div>
        )}

        {activeTab === 'positions' && (
          <div className="bg-surface-charcoal border border-border-subtle rounded-xl overflow-hidden">
            {stakes.length === 0 ? (
              <div className="p-12 text-center text-text-muted">No positions found.</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-surface-base border-b border-border-subtle">
                  <tr>
                    <th className="px-6 py-4 text-xs font-label-caps text-text-muted">Market</th>
                    <th className="px-6 py-4 text-xs font-label-caps text-text-muted">Side</th>
                    <th className="px-6 py-4 text-xs font-label-caps text-text-muted">Size</th>
                    <th className="px-6 py-4 text-xs font-label-caps text-text-muted">P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {stakes.map(stake => (
                    <tr key={stake.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4 font-semibold text-sm">Market #{stake.marketId.slice(0, 8)}...</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-label-caps ${stake.side === 0 ? 'text-tertiary' : 'text-error'}`}>
                           {stake.side === 0 ? 'FOLLOW' : 'FADE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-code-sm text-sm">{stake.amountUsdc} USDC</td>
                      <td className="px-6 py-4 font-code-sm text-sm">
                        {stake.pnl === undefined ? (
                           <span className="text-text-muted">Pending</span>
                        ) : (
                           <span className={stake.pnl > 0 ? 'text-tertiary' : 'text-error'}>
                             {stake.pnl > 0 ? '+' : ''}{stake.pnl.toFixed(2)}
                           </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-charcoal border-l-2 border-l-tertiary border-y border-r border-y-border-subtle border-r-border-subtle p-4 flex gap-4 items-center rounded-r-xl">
              <div className="bg-tertiary/20 text-tertiary p-3 rounded-lg"><TrendingUp size={24} /></div>
              <div>
                <p className="font-semibold text-sm">First Stake</p>
                <p className="text-xs text-text-muted">Executed your first position on ArcSignal.</p>
              </div>
            </div>
            {stats.totalStaked >= 1000 && (
              <div className="bg-surface-charcoal border-l-2 border-l-primary border-y border-r border-y-border-subtle border-r-border-subtle p-4 flex gap-4 items-center rounded-r-xl">
                <div className="bg-primary/20 text-primary p-3 rounded-lg"><Trophy size={24} /></div>
                <div>
                  <p className="font-semibold text-sm">Whale Operator</p>
                  <p className="text-xs text-text-muted">Staked over 1,000 USDC total volume.</p>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ─── Edit Modal Overlay ─── */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-charcoal border border-border-subtle rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-border-subtle flex justify-between items-center">
              <h2 className="text-lg font-headline-md">Edit Profile</h2>
              <button onClick={() => setIsEditing(false)} className="text-text-muted hover:text-white">✕</button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-label-caps text-text-muted block mb-1">Username</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={e => setEditForm({...editForm, username: e.target.value})}
                  className="w-full bg-surface-base border border-border-subtle rounded-lg px-4 py-2 font-code-sm outline-none focus:border-primary transition-colors"
                  placeholder="elite_operator"
                />
              </div>
              <div>
                <label className="text-xs font-label-caps text-text-muted block mb-1">Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={e => setEditForm({...editForm, bio: e.target.value})}
                  className="w-full bg-surface-base border border-border-subtle rounded-lg px-4 py-2 text-sm outline-none focus:border-primary transition-colors min-h-[80px]"
                  placeholder="Tell us about your strategy..."
                />
              </div>
              <div>
                <label className="text-xs font-label-caps text-text-muted block mb-1">Avatar URL</label>
                <input
                  type="text"
                  value={editForm.avatarUrl}
                  onChange={e => setEditForm({...editForm, avatarUrl: e.target.value})}
                  className="w-full bg-surface-base border border-border-subtle rounded-lg px-4 py-2 font-code-sm text-xs outline-none focus:border-primary transition-colors"
                  placeholder="https://example.com/avatar.png"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border-subtle bg-surface-base flex justify-end gap-3">
              <button onClick={() => setIsEditing(false)} className="px-6 py-2 rounded-lg border border-border-subtle text-sm font-label-caps hover:bg-white/5">Cancel</button>
              <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 rounded-lg bg-primary text-black text-sm font-label-caps disabled:opacity-50">
                {isSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
