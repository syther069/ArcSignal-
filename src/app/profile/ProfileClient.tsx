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
          const m = marketMap.get(log.args.marketId!) as any;
          let pnl: number | undefined = undefined;
          
          // getMarket returns a named struct: { marketId, category, question, analysisJson,
          //   resolutionTime, followPool, fadePool, resolved, outcome }
          if (m && m.resolved) {
            // outcome uint8: 1 = follow wins, 2 = fade wins
            const outcome = Number(m.outcome);
            const userSide = Number(log.args.side); // 0 = follow, 1 = fade
            const winningSide = outcome === 1 ? 0 : 1; // 1→follow(0), 2→fade(1)
            const isWin = userSide === winningSide;
            
            // USDC uses 6 decimals
            const amt = Number(log.args.amount) / 1e6;
            if (isWin) {
              const winPool  = Number(winningSide === 0 ? m.followPool : m.fadePool) / 1e6;
              const losePool = Number(winningSide === 0 ? m.fadePool  : m.followPool) / 1e6;
              pnl = winPool > 0 ? (amt * losePool) / winPool : 0; // net profit
            } else {
              pnl = -(Number(log.args.amount) / 1e6);
            }
          }

          return {
            id: log.transactionHash,
            walletAddress: targetAddress,
            txHash: log.transactionHash,
            createdAt: new Date().toISOString(),
            marketId: log.args.marketId!,
            side: Number(log.args.side),
            amountUsdc: Number(log.args.amount) / 1e6, // USDC = 6 decimals
            timestamp: new Date().toISOString(),
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
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { writeContractAsync, isPending: isSaving } = useWriteContract();

  const handleEditClick = () => {
    setEditForm({ username, bio, avatarUrl });
    setAvatarPreview(avatarUrl || null);
    setIsEditing(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);

    // Upload to imgbb for a permanent public URL
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      // Public free imgbb API key (no account required for basic uploads)
      const res = await fetch('https://api.imgbb.com/1/upload?key=2c45e0f5e98e44a1de5d7c1c2e7fc870', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setEditForm(f => ({ ...f, avatarUrl: json.data.url }));
        setAvatarPreview(json.data.url);
      }
    } catch (err) {
      console.error('Upload failed, keeping local preview', err);
    }
    setIsUploading(false);
  };

  const handleSave = async () => {
    if (!targetAddress) return;
    try {
      await writeContractAsync({
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="relative w-full max-w-[520px] overflow-hidden rounded-lg shadow-2xl"
            style={{ background: '#131313', border: '1px solid #3a3939' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: '1px solid #3a3939' }}
            >
              <h2 className="text-xl font-bold tracking-tight text-white uppercase" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                Edit Profile
              </h2>
              <button
                onClick={() => setIsEditing(false)}
                className="transition-colors hover:text-white"
                style={{ color: '#8e8e8e' }}
                type="button"
              >
                <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 space-y-6">

              {/* Avatar Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest" style={{ color: '#8e8e8e', fontFamily: 'JetBrains Mono, monospace' }}>
                  Avatar
                </label>
                <div className="flex items-center gap-4">
                  {/* Preview */}
                  <div
                    className="w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
                    style={{ background: '#1c1b1b', border: '1px solid #3a3939' }}
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                    ) : (
                      <svg fill="none" height="24" stroke="#8e8e8e" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                    )}
                  </div>
                  {/* Upload button */}
                  <div className="flex flex-col gap-2 flex-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full px-4 py-2.5 text-sm font-bold uppercase tracking-wider rounded transition-all"
                      style={{
                        background: '#1c1b1b',
                        border: '1px solid #3a3939',
                        color: isUploading ? '#8e8e8e' : 'white',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {isUploading ? 'Uploading…' : 'Upload Photo'}
                    </button>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: '#8e8e8e', fontFamily: 'JetBrains Mono, monospace' }}>
                      Supports .jpg, .png and .gif
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Username */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest" style={{ color: '#8e8e8e', fontFamily: 'JetBrains Mono, monospace' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                  placeholder="elite_operator"
                  className="w-full text-white text-sm px-4 py-3 rounded outline-none transition-all"
                  style={{
                    background: '#0e0e0e',
                    border: '1px solid #3a3939',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#a855f7')}
                  onBlur={e => (e.target.style.borderColor = '#3a3939')}
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest" style={{ color: '#8e8e8e', fontFamily: 'JetBrains Mono, monospace' }}>
                  Bio
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Tell us about your strategy..."
                  rows={4}
                  className="w-full text-white text-sm px-4 py-3 rounded outline-none transition-all resize-none"
                  style={{
                    background: '#0e0e0e',
                    border: '1px solid #3a3939',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#a855f7')}
                  onBlur={e => (e.target.style.borderColor = '#3a3939')}
                />
              </div>

            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-4 px-6 py-5"
              style={{ borderTop: '1px solid #3a3939' }}
            >
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-6 py-2.5 text-sm font-bold uppercase tracking-wider rounded transition-all"
                style={{
                  border: '1px solid #3a3939',
                  color: 'white',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
                onMouseEnter={e => ((e.target as HTMLElement).style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => ((e.target as HTMLElement).style.background = 'transparent')}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isUploading}
                className="px-8 py-2.5 text-white text-sm font-bold uppercase tracking-wider rounded transition-all active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: '#a855f7',
                  boxShadow: '0 0 15px rgba(168,85,247,0.3)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {isSaving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
