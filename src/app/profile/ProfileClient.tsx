'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  useAccount,
  useBalance,
  useDisconnect,
} from 'wagmi';
import { type Address } from 'viem';
import {
  BarChart2,
  Wallet,
  TrendingUp,
  Trophy,
  FileText,
  Plus,
  HelpCircle,
  Wifi,
  Copy,
  Check,
  Camera,
  Pencil,
  Download,
  Scale,
  ShieldCheck,
  Zap,
  Activity,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
} from 'lucide-react';
import ConnectWalletButton from '@/components/wallet/ConnectWalletButton';
import { UserProfile, Stake } from '@/types';

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  bg:           '#080A0C',
  surface:      '#111416',
  surfaceLow:   '#1a1c1e',
  surfaceHigh:  '#282a2c',
  primary:      '#c0c1ff',
  secondary:    '#b9c8de',
  tertiary:     '#4edea3',
  onSurface:    '#e2e2e5',
  onSurfaceVar: '#c7c4d7',
  error:        '#ffb4ab',
  border:       'rgba(255,255,255,0.08)',
} as const;

// ─── Glass panel style ────────────────────────────────────────────────────────
const glass: React.CSSProperties = {
  background:     'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(30px)',
  border:         `1px solid ${C.border}`,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(address?: string) {
  if (!address) return '—';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function nowHHMMSS() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

// ─── Sub-component: on-chain balance ─────────────────────────────────────────
function BalanceInfo({ address }: { address: Address }) {
  const { data } = useBalance({ address });
  if (!data) return null;
  return (
    <span className="font-mono text-xs" style={{ color: C.onSurfaceVar }}>
      {parseFloat(data.formatted).toFixed(4)} {data.symbol}
    </span>
  );
}

// ─── Sub-component: Stat card ─────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  topBorder?: boolean;
}
function StatCard({ label, value, sub, accent, topBorder }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-6 flex flex-col gap-2"
      style={{
        ...glass,
        borderTop: topBorder ? `2px solid ${accent ?? C.primary}40` : undefined,
      }}
    >
      <p className="uppercase tracking-wider font-semibold" style={{ fontSize: 11, color: C.onSurfaceVar }}>
        {label}
      </p>
      <p className="font-mono text-3xl font-bold" style={{ color: accent ?? C.onSurface }}>
        {value}
      </p>
      {sub && (
        <p className="font-mono" style={{ fontSize: 10, color: `${accent ?? C.onSurfaceVar}99` }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Sub-component: Nav link ──────────────────────────────────────────────────
function NavLink({
  href, label, Icon, active,
}: { href: string; label: string; Icon: React.ElementType; active?: boolean }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:translate-x-1"
      style={{
        color:      active ? C.primary : C.onSurfaceVar,
        background: active ? 'rgba(192,193,255,0.08)' : 'transparent',
        borderLeft: active ? `2px solid ${C.primary}` : '2px solid transparent',
      }}
    >
      <Icon size={18} />
      <span className="font-semibold tracking-wide" style={{ fontSize: 12 }}>{label}</span>
    </Link>
  );
}

// ─── Sub-component: Achievement card ─────────────────────────────────────────
function AchievementCard({
  title, desc, Icon, borderColor, iconBg, iconColor,
}: {
  title: string; desc: string;
  Icon: React.ElementType; borderColor: string; iconBg: string; iconColor: string;
}) {
  return (
    <div
      className="p-3 rounded-lg flex items-center gap-3"
      style={{ ...glass, borderLeft: `2px solid ${borderColor}` }}
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
        <Icon size={20} style={{ color: iconColor }} />
      </div>
      <div>
        <p className="font-bold text-xs" style={{ color: C.onSurface }}>{title}</p>
        <p style={{ fontSize: 10, color: C.onSurfaceVar }}>{desc}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProfileClient() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // ── mounted guard (hydration) ──────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ── avatar ─────────────────────────────────────────────────────────────────
  const [avatarSrc, setAvatarSrc]     = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (address) {
      const saved = localStorage.getItem('arcsignal_avatar_' + address);
      if (saved) setAvatarSrc(saved);
    }
  }, [address]);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const valid = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!valid.includes(file.type)) { showToast('Invalid file type'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('File exceeds 5 MB'); return; }
    const reader = new FileReader();
    setAvatarLoading(true);
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarSrc(result);
      if (address) localStorage.setItem('arcsignal_avatar_' + address, result);
      showToast('Profile photo updated ✓');
      setAvatarLoading(false);
    };
    reader.onerror = () => { showToast('Failed to read file'); setAvatarLoading(false); };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    if (address) localStorage.removeItem('arcsignal_avatar_' + address);
    setAvatarSrc(null);
    showToast('Photo removed');
  };

  // ── toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // ── copy address ───────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);
  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── profile / stakes data ──────────────────────────────────────────────────
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stakes, setStakes]   = useState<Stake[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm]   = useState({ username: '', bio: '' });

  useEffect(() => {
    async function load() {
      if (!address) { setLoading(false); return; }
      setLoading(true);
      try {
        setProfile(null);
        setStakes([]);
      } catch (err) {
        console.error('Failed to load profile data', err);
      }
      setLoading(false);
    }
    load();
  }, [address]);

  const handleSaveProfile = async () => {
    if (!address) return;
    try {
      setProfile(prev => prev
        ? { ...prev, ...editForm }
        : {
            walletAddress: address,
            username: editForm.username, bio: editForm.bio,
            avatarUrl: '', joinedAt: new Date().toISOString(),
            winRate: 0, totalStaked: 0, netProfit: 0,
            marketsEntered: 0, currentStreak: 0, nftMinted: false,
          }
      );
      setIsEditing(false);
      showToast('Profile saved ✓');
    } catch {
      showToast('Profiles unavailable without DB');
    }
  };

  // ── table tab ──────────────────────────────────────────────────────────────
  const [tableTab, setTableTab] = useState<'Active' | 'Settled' | 'All'>('Active');

  const filteredStakes = useMemo(() => {
    if (tableTab === 'Active')  return stakes.filter(s => s.pnl == null);
    if (tableTab === 'Settled') return stakes.filter(s => s.pnl != null);
    return stakes;
  }, [stakes, tableTab]);

  // ── telemetry ──────────────────────────────────────────────────────────────
  const [cpu, setCpu] = useState(42);
  const [ram, setRam] = useState(65);
  const [logLines, setLogLines] = useState<string[]>([]);

  useEffect(() => {
    const msgs = [
      `AUTHENTICATED AS ${fmt(address)}`,
      'NODE_SYNC: BLOCK_7742110 RECEIVED',
      'MARKET_UPDATE: BTC/USD +1.2%',
      'POSITION_REALLOCATION: SOL_POOL',
      'TELEMETRY_PING: SUCCESS',
      'CONTRACT_CALL: REWARD_CLAIMED',
      'BROADCASTING_HEARTBEAT...',
    ];
    setLogLines(msgs.map(m => `[${nowHHMMSS()}] ${m}`));

    const iv = setInterval(() => {
      setCpu(Math.floor(Math.random() * 21) + 35);
      setRam(Math.floor(Math.random() * 16) + 60);
      setLogLines(prev => {
        const next = [...prev, `[${nowHHMMSS()}] TELEMETRY_PING: SUCCESS`];
        return next.slice(-20);
      });
    }, 3000);
    return () => clearInterval(iv);
  }, [address]);

  const latencyBars = [30, 45, 20, 60, 35, 15, 50];

  // ── not connected ──────────────────────────────────────────────────────────
  if (!mounted) return null;

  if (!isConnected) {
    return (
      <div className="flex min-h-screen" style={{ background: C.bg }}>
        {/* Left sidebar placeholder */}
        <aside
          className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 hidden lg:flex flex-col"
          style={{ background: C.surfaceLow, borderRight: `1px solid ${C.border}` }}
        />
        <main className="flex-1 lg:ml-64 pt-32 px-8 flex flex-col items-center justify-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}30` }}
          >
            <Activity size={32} style={{ color: C.primary }} />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: C.onSurface }}>Wallet Not Connected</h2>
          <p className="text-sm mb-8 text-center max-w-md leading-relaxed" style={{ color: C.onSurfaceVar }}>
            Connect your Web3 wallet to view prediction history, portfolio performance, and staking positions.
          </p>
          <ConnectWalletButton />
        </main>
      </div>
    );
  }

  // ── MAIN RENDER ────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen" style={{ background: C.bg }}>

      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
      <aside
        className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 hidden lg:flex flex-col p-4 gap-2 z-40"
        style={{ background: `${C.surfaceLow}80`, backdropFilter: 'blur(24px)', borderRight: `1px solid ${C.border}` }}
      >
        {/* Network status */}
        <div className="mb-6 px-4 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.tertiary }} />
          <span className="font-semibold" style={{ fontSize: 11, color: C.onSurfaceVar, letterSpacing: '0.08em' }}>
            Network Active
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1">
          <NavLink href="/markets"     label="Markets"     Icon={BarChart2}   />
          <NavLink href="/portfolio"   label="Portfolio"   Icon={Wallet}      />
          <NavLink href="/analytics"   label="Analytics"   Icon={TrendingUp}  />
          <NavLink href="/leaderboard" label="Leaderboard" Icon={Trophy}      />
          <NavLink href="/docs"        label="Docs"        Icon={FileText}    />
        </nav>

        {/* Bottom */}
        <div className="mt-auto pt-4 flex flex-col gap-1" style={{ borderTop: `1px solid ${C.border}` }}>
          <button
            className="w-full py-3 px-4 rounded-lg font-bold text-xs tracking-wider mb-4 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            style={{ background: 'rgba(255,255,255,0.05)', color: C.primary }}
          >
            <Plus size={14} /> Create Market
          </button>
          <a href="#" className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors" style={{ color: C.onSurfaceVar }}>
            <HelpCircle size={16} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Support</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors" style={{ color: C.onSurfaceVar }}>
            <Wifi size={16} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Network Status</span>
          </a>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main
        className="flex-1 lg:ml-64 lg:mr-80 overflow-y-auto"
        style={{ minHeight: '100vh', paddingTop: 80 }}
      >
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.primary, borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 pb-16">

            {/* ── PROFILE HEADER ─────────────────────────────────────────── */}
            <header
              className="rounded-xl p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden"
              style={glass}
            >
              {/* Ambient glow */}
              <div className="absolute top-0 right-0 w-80 h-80 pointer-events-none" style={{ background: `radial-gradient(circle, ${C.primary}08 0%, transparent 70%)` }} />

              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-32 h-32 rounded-full p-1 flex items-center justify-center overflow-hidden cursor-pointer group"
                  style={{ border: `2px solid ${C.primary}40` }}
                  onClick={handleAvatarClick}
                >
                  {avatarLoading ? (
                    <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: C.surfaceLow }}>
                      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.primary, borderTopColor: 'transparent' }} />
                    </div>
                  ) : avatarSrc ? (
                    <img src={avatarSrc} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full rounded-full flex items-center justify-center text-3xl font-black uppercase"
                      style={{ background: `linear-gradient(135deg, ${C.primary}30, ${C.tertiary}20)`, color: C.primary }}
                    >
                      {address?.slice(2, 4).toUpperCase()}
                    </div>
                  )}
                  {/* Camera overlay */}
                  <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.6)' }}>
                    <Camera size={22} style={{ color: '#fff' }} />
                  </div>
                </div>
                {/* Online dot */}
                <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 animate-pulse" style={{ background: C.tertiary, borderColor: C.bg }} />
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                {isEditing ? (
                  <div className="space-y-3 max-w-sm">
                    <div>
                      <label className="block mb-1 font-semibold" style={{ fontSize: 10, color: C.onSurfaceVar, letterSpacing: '0.1em' }}>USERNAME</label>
                      <input
                        type="text"
                        value={editForm.username}
                        onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg outline-none font-mono text-sm"
                        style={{ background: C.surfaceLow, border: `1px solid ${C.border}`, color: C.onSurface }}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold" style={{ fontSize: 10, color: C.onSurfaceVar, letterSpacing: '0.1em' }}>BIO</label>
                      <textarea
                        value={editForm.bio}
                        onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg outline-none font-mono text-sm resize-none"
                        style={{ background: C.surfaceLow, border: `1px solid ${C.border}`, color: C.onSurface }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSaveProfile} className="px-5 py-2 rounded-lg font-bold text-xs tracking-wider" style={{ background: C.primary, color: '#1000a9' }}>SAVE</button>
                      <button onClick={() => setIsEditing(false)} className="px-5 py-2 rounded-lg font-bold text-xs tracking-wider" style={{ background: 'rgba(255,255,255,0.05)', color: C.onSurfaceVar, border: `1px solid ${C.border}` }}>CANCEL</button>
                      {avatarSrc && (
                        <button onClick={handleRemovePhoto} className="px-5 py-2 rounded-lg text-xs" style={{ color: C.error }}>Remove photo</button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-3xl font-black mb-1" style={{ color: C.onSurface, letterSpacing: '-0.01em' }}>
                      {profile?.username || fmt(address)}
                    </h1>
                    {/* Address row */}
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                      <Wallet size={14} style={{ color: C.onSurfaceVar }} />
                      <span className="font-mono text-sm" style={{ color: C.onSurfaceVar }}>{fmt(address)}</span>
                      <button onClick={copyAddress} className="transition-colors" style={{ color: copied ? C.tertiary : C.onSurfaceVar }}>
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                      {address && <BalanceInfo address={address} />}
                    </div>
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
                      <span className="px-3 py-1 rounded-full font-bold" style={{ fontSize: 11, background: `${C.primary}15`, color: C.primary, border: `1px solid ${C.primary}30` }}>
                        VERIFIED OPERATOR
                      </span>
                      <span className="px-3 py-1 rounded-full font-bold" style={{ fontSize: 11, background: 'rgba(255,255,255,0.05)', color: C.onSurfaceVar, border: `1px solid ${C.border}` }}>
                        BETA_ACCESS_LVL_4
                      </span>
                    </div>
                    {profile?.bio && (
                      <p className="text-sm leading-relaxed max-w-md" style={{ color: C.onSurfaceVar }}>{profile.bio}</p>
                    )}
                  </>
                )}
              </div>

              {/* Action buttons */}
              {!isEditing && (
                <div className="flex gap-3 flex-shrink-0">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold tracking-wider transition-all hover:bg-white/10"
                    style={{ border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)', color: C.onSurfaceVar }}
                  >
                    <Pencil size={13} /> Edit Profile
                  </button>
                  <button
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold tracking-wider transition-all active:scale-95"
                    style={{ background: C.primary, color: '#1000a9', boxShadow: `0 4px 20px ${C.primary}30` }}
                  >
                    <Download size={13} /> Export Data
                  </button>
                </div>
              )}
            </header>

            {/* ── STATS GRID ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Win Rate"
                value={`${profile?.winRate?.toFixed(1) ?? '0.0'}%`}
                sub="↑ vs last month"
                accent={C.tertiary}
                topBorder
              />
              <StatCard
                label="Total Staked"
                value={profile?.totalStaked ? `${profile.totalStaked.toLocaleString()} ARC` : '0 ARC'}
                sub="4.2% APY reward"
              />
              <StatCard
                label="Net P&L"
                value={`${(profile?.netProfit ?? 0) >= 0 ? '+' : ''}$${(profile?.netProfit ?? 0).toLocaleString()}`}
                sub="Total realized gains"
                accent={C.tertiary}
              />
              <StatCard
                label="Global Rank"
                value={`#${profile ? '42' : '—'}`}
                sub={profile ? 'Top 0.1% of Analysts' : 'No rank yet'}
                accent={C.primary}
              />
            </div>

            {/* ── POSITIONS TABLE ───────────────────────────────────────── */}
            <div className="rounded-xl overflow-hidden" style={glass}>
              {/* Table header / tabs */}
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                <div className="flex gap-6">
                  {(['Active', 'Settled', 'All'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setTableTab(tab)}
                      className="font-bold pb-4 -mb-4 transition-all text-xs tracking-wider"
                      style={{
                        color:        tableTab === tab ? C.primary : C.onSurfaceVar,
                        borderBottom: tableTab === tab ? `2px solid ${C.primary}` : '2px solid transparent',
                      }}
                    >
                      {tab === 'Active' ? 'Active Positions' : tab === 'Settled' ? 'Settled History' : 'All Records'}
                    </button>
                  ))}
                </div>
                <Filter size={18} style={{ color: C.onSurfaceVar }} />
              </div>

              {filteredStakes.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Scale size={48} style={{ color: C.onSurfaceVar, opacity: 0.4 }} />
                  <p className="font-semibold" style={{ color: C.onSurface }}>No active positions</p>
                  <p className="text-sm" style={{ color: C.onSurfaceVar }}>Follow or fade a market to get started</p>
                  <Link href="/markets">
                    <button
                      className="mt-2 px-6 py-2.5 rounded-lg font-bold text-xs tracking-wider flex items-center gap-2 transition-all active:scale-95"
                      style={{ background: C.primary, color: '#1000a9' }}
                    >
                      Browse Markets <ArrowRight size={13} />
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.015)', borderBottom: `1px solid ${C.border}` }}>
                        {['Market Asset', 'Direction', 'Size', 'Entry Price', 'Status', 'Outcome'].map(col => (
                          <th key={col} className="px-6 py-4 font-bold uppercase tracking-wider" style={{ fontSize: 11, color: C.onSurfaceVar }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStakes.map(stake => {
                        const isWin     = (stake.pnl ?? 0) > 0;
                        const resolved  = stake.pnl != null;
                        return (
                          <tr key={stake.id} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded font-mono font-bold text-xs flex items-center justify-center" style={{ background: `${C.primary}20`, color: C.primary }}>
                                  MKT
                                </div>
                                <div>
                                  <p className="font-semibold text-sm" style={{ color: C.onSurface }}>Market #{stake.marketId.slice(0, 8)}</p>
                                  <p className="font-mono" style={{ fontSize: 10, color: C.onSurfaceVar }}>{stake.id.slice(0, 12)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="flex items-center gap-1 font-bold text-xs" style={{ color: stake.side === 0 ? C.tertiary : C.error }}>
                                {stake.side === 0
                                  ? <><ArrowUpRight size={14} /> FOLLOW</>
                                  : <><ArrowDownRight size={14} /> FADE</>
                                }
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-sm" style={{ color: C.onSurface }}>
                              ${stake.amountUsdc.toLocaleString()} USDC
                            </td>
                            <td className="px-6 py-4 font-mono text-sm" style={{ color: C.onSurface }}>—</td>
                            <td className="px-6 py-4">
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full font-bold"
                                style={{
                                  fontSize:   10,
                                  background: resolved ? (isWin ? `${C.tertiary}15` : `${C.error}15`) : `${C.primary}15`,
                                  color:      resolved ? (isWin ? C.tertiary : C.error) : C.primary,
                                  border:     `1px solid ${resolved ? (isWin ? C.tertiary : C.error) : C.primary}30`,
                                }}
                              >
                                {resolved ? (isWin ? 'WIN' : 'LOSS') : 'ACTIVE'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-sm" style={{ color: resolved ? (isWin ? C.tertiary : C.error) : C.onSurfaceVar }}>
                              {resolved ? `${isWin ? '+' : '-'}$${Math.abs(stake.pnl!).toLocaleString()}` : 'Pending'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="p-4 flex justify-center" style={{ background: 'rgba(255,255,255,0.01)' }}>
                    <button className="flex items-center gap-2 text-xs font-bold transition-colors" style={{ color: C.onSurfaceVar }}>
                      View All Positions <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── FOOTER ─────────────────────────────────────────────────── */}
            <footer
              className="w-full flex flex-col md:flex-row justify-between items-center py-8 gap-4 mt-8"
              style={{ borderTop: `1px solid ${C.border}` }}
            >
              <p className="font-black text-lg" style={{ color: C.onSurface }}>ArcSignal</p>
              <div className="flex flex-wrap justify-center gap-6">
                {['Terms of Service', 'Privacy Policy', 'Technical Whitepaper', 'API Docs'].map(l => (
                  <a key={l} href="#" className="text-sm hover:opacity-80 transition-opacity" style={{ color: C.onSurfaceVar }}>{l}</a>
                ))}
              </div>
              <p className="text-xs text-center md:text-right" style={{ color: C.onSurfaceVar }}>
                © 2024 ArcSignal Protocol. All rights reserved.
              </p>
            </footer>

          </div>
        )}
      </main>

      {/* ── RIGHT SIDEBAR ────────────────────────────────────────────────── */}
      <aside
        className="fixed right-0 top-16 h-[calc(100vh-64px)] w-80 hidden lg:flex flex-col p-6 overflow-y-auto z-40"
        style={{ background: `${C.surfaceLow}80`, backdropFilter: 'blur(24px)', borderLeft: `1px solid ${C.border}` }}
      >

        {/* ── ACHIEVEMENTS ───────────────────────────────────────────────── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold uppercase tracking-widest" style={{ fontSize: 11, color: C.onSurfaceVar }}>
              Achievements
            </h3>
            <span className="font-mono" style={{ fontSize: 10, color: C.primary }}>3 / 12 UNLOCKED</span>
          </div>
          <div className="flex flex-col gap-3">
            <AchievementCard
              title="Early Adopter"
              desc="Joined during Protocol Epoch 1"
              Icon={ShieldCheck}
              borderColor={C.tertiary}
              iconBg={`${C.tertiary}15`}
              iconColor={C.tertiary}
            />
            <AchievementCard
              title="High Stakes"
              desc="Executed position > 10,000 ARC"
              Icon={Zap}
              borderColor={C.primary}
              iconBg={`${C.primary}15`}
              iconColor={C.primary}
            />
            <AchievementCard
              title="Streak Master"
              desc="5 consecutive profitable settlements"
              Icon={TrendingUp}
              borderColor={C.secondary}
              iconBg={`${C.secondary}15`}
              iconColor={C.secondary}
            />
          </div>
        </section>

        {/* ── TELEMETRY ──────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold uppercase tracking-widest" style={{ fontSize: 11, color: C.onSurfaceVar }}>
              Telemetry
            </h3>
            <span className="font-mono font-bold" style={{ fontSize: 10, color: C.primary }}>SYNC_STABLE</span>
          </div>

          <div className="space-y-4">
            {/* CPU */}
            <div>
              <div className="flex justify-between font-mono uppercase mb-1" style={{ fontSize: 10, color: C.onSurfaceVar }}>
                <span>CPU_LOAD</span>
                <span>{cpu}%</span>
              </div>
              <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${cpu}%`, background: C.primary }}
                />
              </div>
            </div>

            {/* RAM */}
            <div>
              <div className="flex justify-between font-mono uppercase mb-1" style={{ fontSize: 10, color: C.onSurfaceVar }}>
                <span>RAM_USAGE</span>
                <span>{(ram / 10).toFixed(1)} GB / 8 GB</span>
              </div>
              <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${ram}%`, background: C.secondary }}
                />
              </div>
            </div>

            {/* Latency sparkline */}
            <div>
              <div className="flex justify-between font-mono uppercase mb-1" style={{ fontSize: 10, color: C.onSurfaceVar }}>
                <span>LATENCY</span>
                <span>12ms</span>
              </div>
              <div className="flex gap-1 h-5 items-end">
                {latencyBars.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm"
                    style={{
                      height:     `${h}%`,
                      background: i === latencyBars.length - 1 ? C.tertiary : `${C.tertiary}50`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Session log */}
          <div className="mt-6 pt-5" style={{ borderTop: `1px solid ${C.border}` }}>
            <p className="font-mono mb-2" style={{ fontSize: 10, color: C.primary }}>&gt; SESSION_LOG</p>
            <div
              className="rounded-lg p-3 overflow-hidden relative"
              style={{ background: 'rgba(0,0,0,0.45)', height: 128 }}
            >
              <div className="space-y-1">
                {logLines.slice(-8).map((line, i) => (
                  <p key={i} className="font-mono leading-relaxed" style={{ fontSize: 10, color: C.onSurfaceVar }}>
                    {line}
                  </p>
                ))}
              </div>
              {/* Fade overlay */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 60%)' }} />
            </div>
          </div>
        </section>
      </aside>

      {/* ── GLOBAL TOAST ─────────────────────────────────────────────────── */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-lg font-mono text-xs font-bold z-[9999] transition-all"
          style={{ background: C.surfaceHigh, border: `1px solid ${C.tertiary}50`, color: C.tertiary, boxShadow: `0 8px 32px rgba(0,0,0,0.5)` }}
        >
          <Check size={14} /> {toast}
        </div>
      )}
    </div>
  );
}
