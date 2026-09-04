'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
  usePublicClient,
} from 'wagmi';
import { decodeEventLog, type Address } from 'viem';
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
  Clock,
} from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import ConnectWalletButton from '@/components/wallet/ConnectWalletButton';
import { arcTestnet, ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import { Stake as BaseStake } from '@/types';
import toast from 'react-hot-toast';

interface Stake extends BaseStake {
  isWin?: boolean;
}

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
  const { address: connectedAddress, isConnected, chainId } = useAccount();
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

  const [localProfile, setLocalProfile] = useState<{username: string, bio: string, avatarUrl: string} | null>(null);

  let chainUsername = '';
  let chainBio = '';
  let chainAvatarUrl = '';

  if (profileData) {
    if (Array.isArray(profileData)) {
      chainUsername = profileData[0] || '';
      chainBio = profileData[1] || '';
      chainAvatarUrl = profileData[2] || '';
    } else if (typeof profileData === 'object') {
      const p = profileData as { username?: string; bio?: string; avatarUrl?: string };
      chainUsername = p.username || '';
      chainBio = p.bio || '';
      chainAvatarUrl = p.avatarUrl || '';
    }
  }

  const username = localProfile?.username ?? chainUsername;
  const bio = localProfile?.bio ?? chainBio;
  const avatarUrl = localProfile?.avatarUrl ?? chainAvatarUrl;

  // ─── Position Data from Contract ────────────────────────────────────────────
  const [stakes, setStakes] = useState<Stake[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(true);
  const positionsRequest = useRef<Promise<void> | null>(null);

  const loadPositions = React.useCallback(async () => {
    if (!targetAddress) { setStakes([]); setLoadingPositions(false); return; }
    if (positionsRequest.current) return positionsRequest.current;
    const request = (async () => {
      setLoadingPositions(true);
      try {
        const response = await fetch(`/api/portfolio?address=${encodeURIComponent(targetAddress)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Portfolio request failed (${response.status})`);
        const data = await response.json();
        const nextStakes: Stake[] = (data.positions ?? []).map((position: any, index: number) => ({
          id: `${position.marketId}-${position.side}-${index}`,
          walletAddress: targetAddress,
          txHash: '',
          createdAt: new Date().toISOString(),
          marketId: position.marketId,
          side: Number(position.side),
          amountUsdc: Number(position.stakeUsdc ?? 0),
          timestamp: new Date().toISOString(),
          pnl: position.isResolved ? Number(position.netPnl ?? 0) : undefined,
          isWin: position.isResolved ? Boolean(position.userWon) : undefined,
        } as Stake));
        setStakes(nextStakes);
      } catch (err) { console.error('Failed to load portfolio positions:', err); }
      finally { setLoadingPositions(false); }
    })();
    positionsRequest.current = request;
    try { await request; } finally { positionsRequest.current = null; }
  }, [targetAddress]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (document.visibilityState === 'visible') await loadPositions();
      if (!cancelled) timer = setTimeout(() => void poll(), 60_000);
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadPositions();
    };

    void poll();
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [loadPositions]);

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
        if (s.isWin) wins++;
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
  const [isConfirmingProfile, setIsConfirmingProfile] = useState(false);
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

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Choose a JPEG, PNG, or WebP image');
      e.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Profile images must be 2 MB or smaller');
      e.target.value = '';
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);

    // Upload via server proxy endpoint
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/profile/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.url) {
        throw new Error(json.error || 'Profile image upload failed');
      }

      setEditForm(f => ({ ...f, avatarUrl: json.url }));
      setAvatarPreview(json.url);
    } catch (err) {
      URL.revokeObjectURL(localUrl);
      setAvatarPreview(editForm.avatarUrl || null);
      toast.error(err instanceof Error ? err.message : 'Profile image upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };


  const handleSave = async () => {
    if (!targetAddress) return;
    if (!publicClient) {
      toast.error('ARC RPC is unavailable. Please try again.');
      return;
    }
    if (chainId !== arcTestnet.id) {
      toast.error('Switch to ARC Testnet before updating your profile.');
      return;
    }

    const newUsername = editForm.username.trim();
    if (newUsername.length > 0) {
      if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
        toast.error('Username can only contain letters, numbers, and underscores');
        return;
      }
      if (newUsername.length < 3 || newUsername.length > 20) {
        toast.error('Username must be between 3 and 20 characters');
        return;
      }

      // Pre-flight check if username is taken
      try {
        if (publicClient && newUsername !== username) {
          const owner = await publicClient.readContract({
            address: ARCSIGNAL_ADDRESS,
            abi: ARCSIGNAL_ABI,
            functionName: 'getAddressByUsername',
            args: [newUsername]
          }) as string;
          
          if (owner && owner !== '0x0000000000000000000000000000000000000000' && owner.toLowerCase() !== targetAddress.toLowerCase()) {
            toast.error('Username is already taken by another operator');
            return;
          }
        }
      } catch (err) {
        console.error('Username availability check failed', err);
        toast.error('Could not verify username availability. Please retry.');
        return;
      }
    }

    try {
      setIsConfirmingProfile(true);
      const { request } = await publicClient.simulateContract({
        account: targetAddress as Address,
        address: ARCSIGNAL_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'setProfile',
        args: [newUsername, editForm.bio, editForm.avatarUrl],
      });
      const hash = await writeContractAsync(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success' || receipt.to?.toLowerCase() !== ARCSIGNAL_ADDRESS.toLowerCase()) {
        throw new Error('Profile transaction was not finalized successfully on ArcSignal.');
      }
      const hasMatchingProfileEvent = receipt.logs.some((log) => {
        if (log.address.toLowerCase() !== ARCSIGNAL_ADDRESS.toLowerCase()) return false;
        try {
          const decoded = decodeEventLog({ abi: ARCSIGNAL_ABI, data: log.data, topics: log.topics });
          if (decoded.eventName !== 'ProfileUpdated') return false;
          const args = decoded.args as {
            user: string;
            username: string;
            bio: string;
            avatarUrl: string;
          };
          return args.user.toLowerCase() === targetAddress.toLowerCase()
            && args.username === newUsername
            && args.bio === editForm.bio
            && args.avatarUrl === editForm.avatarUrl;
        } catch {
          return false;
        }
      });
      if (!hasMatchingProfileEvent) {
        throw new Error('The finalized transaction did not contain the expected ArcSignal profile event.');
      }

      toast.success('Profile finalized on Arc.');
      setIsEditing(false);
      setLocalProfile({ username: newUsername, bio: editForm.bio, avatarUrl: editForm.avatarUrl });
    } catch (e: any) {
      console.error('Failed to save profile', e);
      toast.error('Update failed: ' + (e?.shortMessage || e?.message || 'Unknown error'));
    } finally {
      setIsConfirmingProfile(false);
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
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="lg:ml-[264px] flex-1 pt-24 pb-20 px-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
      
      {/* ─── LEFT COLUMN: IDENTITY ─── */}
      <aside className="w-full md:w-80 flex-shrink-0 flex flex-col gap-6">
        <div className="bg-[#1c1b1b] border border-[#3a3939] rounded-2xl p-6 text-center shadow-xl">
          
          <div className="w-32 h-32 mx-auto rounded-full mb-4 overflow-hidden bg-[#131313] border border-[#3a3939] flex items-center justify-center relative group">
            {avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl text-[#ddb7ff] font-headline-xl">{targetAddress.slice(2, 4).toUpperCase()}</span>
            )}
          </div>
          
          <h1 className="text-3xl font-[family-name:var(--font-hanken)] font-bold text-white tracking-tight mb-2">
            {username || 'Anonymous User'}
          </h1>
          
          <div className="flex items-center justify-center gap-2 mb-4 text-[#94a3b8]">
            <Wallet size={14} />
            <span className="font-code-sm">{fmt(targetAddress)}</span>
            <button onClick={copyAddress} className="hover:text-[#ddb7ff] transition-colors">
              {copied ? <Check size={14} className="text-[#4fdbc8]" /> : <Copy size={14} />}
            </button>
          </div>
          
          {bio && <p className="text-sm text-[#94a3b8] mb-6 leading-relaxed">{bio}</p>}
          
          {!isPublic && (
            <button
              onClick={handleEditClick}
              className="w-full py-3 rounded-xl bg-[#ddb7ff] text-[#0f172a] font-[family-name:var(--font-inter)] font-bold text-sm hover:bg-[#f0dbff] transition-all shadow-lg shadow-[#ddb7ff]/10 flex items-center justify-center gap-2"
            >
              <Pencil size={15} />
              Edit Profile
            </button>
          )}

          <div className="mt-6 flex flex-col gap-2 border-t border-[#3a3939] pt-6 text-left">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#94a3b8]">Win Rate</span>
              {loadingPositions ? (
                <div className="h-4 w-12 bg-[#2a2929] rounded animate-pulse"></div>
              ) : (
                <span className="font-code-sm text-[#fbbf24] font-bold">{stats.winRate.toFixed(1)}%</span>
              )}
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#94a3b8]">Net P&L</span>
              {loadingPositions ? (
                <div className="h-4 w-16 bg-[#2a2929] rounded animate-pulse"></div>
              ) : (
                <span className={`font-code-sm font-bold ${stats.netProfit >= 0 ? 'text-[#86efac]' : 'text-[#ffb4ab]'}`}>
                  {stats.netProfit >= 0 ? '+' : ''}{stats.netProfit.toFixed(2)} USDC
                </span>
              )}
            </div>
          </div>

        </div>
      </aside>

      {/* ─── RIGHT COLUMN: CONTENT ─── */}
      <main className="flex-1 flex flex-col gap-6">
        
        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-[#3a3939] pb-4">
          {['overview', 'positions', 'achievements'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`text-sm font-[family-name:var(--font-inter)] font-medium tracking-wide transition-colors pb-4 -mb-[17px] capitalize ${
                activeTab === tab ? 'text-[#ddb7ff] border-b-2 border-[#ddb7ff]' : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingPositions ? (
              <>
                 <div className="bg-[#1c1b1b] border border-[#3a3939] rounded-xl h-[100px] animate-pulse"></div>
                 <div className="bg-[#1c1b1b] border border-[#3a3939] rounded-xl h-[100px] animate-pulse"></div>
                 <div className="bg-[#1c1b1b] border border-[#3a3939] rounded-xl h-[100px] animate-pulse"></div>
              </>
            ) : (
              <>
                 <div className="bg-[#1c1b1b] border border-[#3a3939] rounded-xl p-5 border-t-2 border-t-[#c4b5fd]">
                    <p className="text-[#64748b] text-[0.72rem] font-medium uppercase tracking-[0.1em] mb-2">Total Staked</p>
                    <p className="text-2xl font-[family-name:var(--font-jetbrains-mono)] font-bold text-[#c4b5fd]">
                      {stats.totalStaked.toLocaleString(undefined, {maximumFractionDigits:2})} USDC
                    </p>
                 </div>
                 <div className="bg-[#1c1b1b] border border-[#3a3939] rounded-xl p-5 border-t-2" style={{ borderTopColor: stats.netProfit >= 0 ? '#86efac' : '#ffb4ab' }}>
                    <p className="text-[#64748b] text-[0.72rem] font-medium uppercase tracking-[0.1em] mb-2">Total P&L</p>
                    <p className={`text-2xl font-[family-name:var(--font-jetbrains-mono)] font-bold ${stats.netProfit >= 0 ? 'text-[#86efac]' : 'text-[#ffb4ab]'}`}>
                      {stats.netProfit >= 0 ? '+' : ''}{stats.netProfit.toLocaleString(undefined, {maximumFractionDigits:2})} USDC
                    </p>
                 </div>
                 <div className="bg-[#1c1b1b] border border-[#3a3939] rounded-xl p-5 border-t-2 border-t-[#fbbf24]">
                    <p className="text-[#64748b] text-[0.72rem] font-medium uppercase tracking-[0.1em] mb-2">Markets Entered</p>
                    <p className="text-2xl font-[family-name:var(--font-jetbrains-mono)] font-bold text-[#fbbf24]">{stats.marketsEntered}</p>
                 </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'positions' && (
          <div className="bg-[#1c1b1b] border border-[#3a3939] rounded-xl overflow-hidden shadow-xl">
            {loadingPositions ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-[#131313] rounded-lg animate-pulse border border-[#3a3939]">
                    <div className="h-4 w-48 bg-[#2a2929] rounded"></div>
                    <div className="h-4 w-16 bg-[#2a2929] rounded"></div>
                    <div className="h-4 w-24 bg-[#2a2929] rounded"></div>
                  </div>
                ))}
              </div>
            ) : stakes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center border border-[#3a3939] rounded-xl bg-[#1c1b1b]">
                <Clock size={36} className="text-[#94a3b8] opacity-50" />
                <p className="font-headline-lg text-lg text-[#ddb7ff] font-bold">No positions found</p>
                <p className="font-code-sm text-xs text-[#94a3b8] max-w-xs">This operator hasn&apos;t staked on any markets yet.</p>
                <Link href="/markets" className="mt-2 px-5 py-2.5 rounded-xl bg-[#ddb7ff] text-[#0f172a] font-[family-name:var(--font-inter)] text-xs font-bold tracking-wide hover:bg-[#f0dbff] transition-all shadow-lg shadow-[#ddb7ff]/10">
                  Browse Markets →
                </Link>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-[#131313] border-b border-[#3a3939]">
                  <tr>
                    <th className="px-6 py-4 text-xs font-[family-name:var(--font-inter)] font-semibold uppercase tracking-wider text-[#94a3b8]">Market</th>
                    <th className="px-6 py-4 text-xs font-[family-name:var(--font-inter)] font-semibold uppercase tracking-wider text-[#94a3b8]">Side</th>
                    <th className="px-6 py-4 text-xs font-[family-name:var(--font-inter)] font-semibold uppercase tracking-wider text-[#94a3b8]">Size</th>
                    <th className="px-6 py-4 text-xs font-[family-name:var(--font-inter)] font-semibold uppercase tracking-wider text-[#94a3b8]">P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3a3939]">
                  {stakes.map(stake => (
                    <tr key={stake.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4 font-[family-name:var(--font-inter)] font-semibold text-sm">Market #{stake.marketId.slice(0, 8)}...</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-[family-name:var(--font-inter)] font-bold uppercase tracking-wider ${stake.side === 0 ? 'text-[#4fdbc8]' : 'text-[#ffb4ab]'}`}>
                           {stake.side === 0 ? 'Follow' : 'Fade'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-code-sm text-sm">{stake.amountUsdc} USDC</td>
                      <td className="px-6 py-4 font-code-sm text-sm">
                        {stake.pnl === undefined ? (
                           <span className="text-[#94a3b8]">Pending</span>
                        ) : (
                           <span className={stake.pnl > 0 ? 'text-[#86efac]' : 'text-[#ffb4ab]'}>
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
            <div className="bg-[#1c1b1b] border-l-2 border-l-[#4fdbc8] border-y border-r border-[#3a3939] p-4 flex gap-4 items-center rounded-r-xl shadow-lg">
              <div className="bg-[#4fdbc8]/20 text-[#4fdbc8] p-3 rounded-lg"><TrendingUp size={24} /></div>
              <div>
                <p className="font-semibold text-sm text-white">First Stake</p>
                <p className="text-xs text-[#94a3b8]">Executed your first position on ArcSignal.</p>
              </div>
            </div>
            {stats.totalStaked >= 1000 && (
              <div className="bg-[#1c1b1b] border-l-2 border-l-[#ddb7ff] border-y border-r border-[#3a3939] p-4 flex gap-4 items-center rounded-r-xl shadow-lg">
                <div className="bg-[#ddb7ff]/20 text-[#ddb7ff] p-3 rounded-lg"><Trophy size={24} /></div>
                <div>
                  <p className="font-semibold text-sm text-white">Whale Operator</p>
                  <p className="text-xs text-[#94a3b8]">Staked over 1,000 USDC total volume.</p>
                </div>
              </div>
            )}
          </div>
        )}

      </main>
      </div>
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
                      /* eslint-disable-next-line @next/next/no-img-element */
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
                      className="w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-all"
                      style={{
                        background: '#1c1b1b',
                        border: '1px solid #3a3939',
                        color: isUploading ? '#8e8e8e' : 'white',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      {isUploading ? 'Uploading…' : 'Upload Photo'}
                    </button>
                    <p className="text-[10px] text-center" style={{ color: '#8e8e8e', fontFamily: 'Inter, sans-serif' }}>
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
                <label className="block text-xs font-semibold text-[#8e8e8e]" style={{ fontFamily: 'Inter, sans-serif' }}>
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
                <label className="block text-xs font-semibold text-[#8e8e8e]" style={{ fontFamily: 'Inter, sans-serif' }}>
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
                className="px-6 py-2.5 text-sm font-semibold rounded-lg transition-all"
                style={{
                  border: '1px solid #3a3939',
                  color: 'white',
                  fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={e => ((e.target as HTMLElement).style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => ((e.target as HTMLElement).style.background = 'transparent')}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isUploading || isSaving || isConfirmingProfile}
                className="px-8 py-2.5 text-[#0f172a] text-sm font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: '#ddb7ff',
                  boxShadow: '0 4px 15px rgba(221,183,255,0.2)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {isUploading ? 'Uploading...' : isConfirmingProfile ? 'Finalizing on Arc...' : isSaving ? 'Sign in Wallet...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
