'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { StatCard } from '@/components/ui/StatCard';
import { useAccount } from 'wagmi';
import { getUserProfile, getUserStakes, updateUserProfile } from '@/lib/supabase';
import { UserProfile, Stake } from '@/types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function ProfileClient() {
  const { address, isConnected } = useAccount();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stakes, setStakes] = useState<Stake[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', bio: '' });
  
  const [historyTab, setHistoryTab] = useState<'ALL' | 'WINS' | 'LOSSES'>('ALL');

  useEffect(() => {
    async function loadData() {
      if (!address) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const p = await getUserProfile(address);
        if (p) {
          setProfile(p);
          setEditForm({ username: p.username, bio: p.bio });
        }
        
        const s = await getUserStakes(address);
        setStakes(s);
      } catch (err) {
        console.error('Failed to load profile data', err);
      }
      setLoading(false);
    }
    loadData();
  }, [address]);

  const handleSaveProfile = async () => {
    if (!address) return;
    try {
      await updateUserProfile(address, {
        username: editForm.username,
        bio: editForm.bio
      });
      // Optimistic update
      setProfile(prev => prev ? { ...prev, ...editForm } : {
        walletAddress: address,
        username: editForm.username,
        bio: editForm.bio,
        avatarUrl: '',
        joinedAt: new Date().toISOString(),
        winRate: 0,
        totalStaked: 0,
        netProfit: 0,
        marketsEntered: 0,
        currentStreak: 0,
        nftMinted: false
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save profile', err);
    }
  };

  // Generate chart data from stakes (Mocking PnL curve for demonstration)
  const chartData = useMemo(() => {
    if (stakes.length === 0) return [];
    
    // Sort oldest to newest for the chart
    const sorted = [...stakes].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let cumulativePnl = 0;
    
    return sorted.map((s, i) => {
      // Mocking PNL calculation for demo purposes if not present
      const pnl = s.pnl !== undefined ? s.pnl : (Math.random() > 0.5 ? s.amountUsdc * 0.8 : -s.amountUsdc);
      cumulativePnl += pnl;
      return {
        name: `T+${i+1}`,
        pnl: cumulativePnl
      };
    });
  }, [stakes]);

  const filteredHistory = useMemo(() => {
    return stakes.filter(s => {
      // Mock win/loss if pnl not defined
      const isWin = s.pnl !== undefined ? s.pnl > 0 : Math.random() > 0.5;
      if (historyTab === 'WINS') return isWin;
      if (historyTab === 'LOSSES') return !isWin;
      return true;
    });
  }, [stakes, historyTab]);

  if (!isConnected) {
    return (
      <div className="flex min-h-screen bg-[#101416]">
        <Sidebar />
        <main className="flex-1 lg:ml-[264px] pt-32 px-8 flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-slate-500">account_balance_wallet</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Wallet Not Connected</h2>
          <p className="text-slate-400 font-mono text-sm mb-6">Please connect your wallet to view your profile.</p>
          {/* @ts-ignore */}
          <w3m-button />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#101416]">
      <Sidebar />

      <main className="flex-1 lg:ml-[264px] pt-24 px-8 pb-16 overflow-y-auto min-h-screen">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <div className="glass-card p-8 bg-[#0a1628]/80 border-white/5 mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#38bdf8] opacity-5 blur-[100px]"></div>
              
              <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#38bdf8] to-indigo-600 border-[3px] border-[#0a1628] shadow-[0_0_20px_rgba(56,189,248,0.3)] flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-white">person</span>
                  )}
                </div>
                
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label className="font-mono text-[10px] tracking-widest text-[#38bdf8] uppercase block mb-1">Username</label>
                        <input 
                          type="text" 
                          value={editForm.username} 
                          onChange={e => setEditForm({...editForm, username: e.target.value})}
                          className="w-full bg-[#020817] border border-white/10 p-2 font-mono text-sm text-white focus:border-[#38bdf8] outline-none rounded"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] tracking-widest text-[#38bdf8] uppercase block mb-1">Bio</label>
                        <textarea 
                          value={editForm.bio} 
                          onChange={e => setEditForm({...editForm, bio: e.target.value})}
                          className="w-full bg-[#020817] border border-white/10 p-2 font-mono text-sm text-white focus:border-[#38bdf8] outline-none rounded min-h-[80px]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleSaveProfile} className="bg-[#38bdf8] text-[#020817] px-4 py-1 font-bold font-mono text-xs rounded hover:bg-[#38bdf8]/80">SAVE</button>
                        <button onClick={() => setIsEditing(false)} className="bg-white/5 border border-white/10 text-slate-300 px-4 py-1 font-bold font-mono text-xs rounded hover:bg-white/10">CANCEL</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <h1 className="text-[32px] font-black text-white leading-none mb-2">
                            {profile?.username || 'AnonTrader'}
                          </h1>
                          <div className="flex items-center gap-2 mb-4">
                            <span className="bg-white/10 text-white font-mono text-xs px-2 py-0.5 rounded border border-white/10">
                              {address?.substring(0, 6)}...{address?.slice(-4)}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500 tracking-widest uppercase">
                              Joined {profile?.joinedAt ? new Date(profile.joinedAt).toLocaleDateString() : 'Today'}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-1.5 rounded hover:bg-white/10 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px] text-slate-300">edit</span>
                          <span className="font-mono text-[10px] tracking-widest font-bold text-slate-300 uppercase">Edit Profile</span>
                        </button>
                      </div>
                      <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
                        {profile?.bio || 'No bio provided. Update your profile to tell the community about your trading strategy.'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <StatCard label="WIN RATE" value={`${profile?.winRate?.toFixed(1) || '0.0'}%`} />
              <StatCard label="TOTAL STAKED" value={`$${(profile?.totalStaked || 0).toLocaleString()}`} />
              <StatCard label="NET PROFIT" value={`$${(profile?.netProfit || 0).toLocaleString()}`} changePositive={(profile?.netProfit || 0) >= 0} />
              <StatCard label="MARKETS" value={(profile?.marketsEntered || 0).toString()} />
              <StatCard label="STREAK" value={`${profile?.currentStreak || 0} Wins`} />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-12 gap-8">
              
              {/* Left Column: Chart & History */}
              <div className="col-span-12 lg:col-span-8 space-y-8">
                
                {/* Portfolio P&L Chart */}
                <div className="glass-card p-6 bg-[#0a1628]/80 border-white/5">
                  <h3 className="font-mono text-sm font-bold text-slate-300 mb-6 tracking-widest uppercase flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#38bdf8]">monitoring</span>
                    Cumulative P&L
                  </h3>
                  <div className="h-[250px] w-full">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 0, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} />
                          <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} tickFormatter={(val) => `$${val}`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f1f38', borderColor: 'rgba(255,255,255,0.1)', fontFamily: 'monospace', fontSize: '12px' }}
                            itemStyle={{ color: '#38bdf8' }}
                          />
                          <Line type="stepAfter" dataKey="pnl" stroke="#38bdf8" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center border border-white/5 border-dashed">
                        <span className="font-mono text-xs text-slate-500">No staking data available.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Staking History */}
                <div className="glass-card p-6 bg-[#0a1628]/80 border-white/5">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className="font-mono text-sm font-bold text-slate-300 tracking-widest uppercase flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#38bdf8]">receipt_long</span>
                      Staking History
                    </h3>
                    
                    <div className="flex bg-[#0f1f38] p-1 rounded-md border border-white/10">
                      {(['ALL', 'WINS', 'LOSSES'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setHistoryTab(tab)}
                          className={`px-4 py-1.5 text-[10px] font-bold font-mono tracking-widest rounded transition-all whitespace-nowrap ${
                            historyTab === tab
                              ? 'bg-[#38bdf8]/20 border border-[#38bdf8]/40 text-[#38bdf8]'
                              : 'bg-transparent border border-transparent text-slate-400 hover:text-white'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="pb-3 font-mono text-[10px] tracking-widest text-slate-500 uppercase">Date</th>
                          <th className="pb-3 font-mono text-[10px] tracking-widest text-slate-500 uppercase">Market</th>
                          <th className="pb-3 font-mono text-[10px] tracking-widest text-slate-500 uppercase text-right">Size (USDC)</th>
                          <th className="pb-3 font-mono text-[10px] tracking-widest text-slate-500 uppercase text-right">Result</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-xs">
                        {filteredHistory.length > 0 ? (
                          filteredHistory.map((stake) => {
                            const isWin = stake.pnl !== undefined ? stake.pnl > 0 : Math.random() > 0.5;
                            const pnlValue = stake.pnl !== undefined ? stake.pnl : (isWin ? stake.amountUsdc * 0.8 : -stake.amountUsdc);
                            
                            return (
                              <tr key={stake.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                <td className="py-3 text-slate-500">{new Date(stake.createdAt).toLocaleDateString()}</td>
                                <td className="py-3 text-white truncate max-w-[200px]">Market #{stake.marketId.substring(0, 8)}</td>
                                <td className="py-3 text-right text-slate-300">${stake.amountUsdc.toLocaleString()}</td>
                                <td className={`py-3 text-right font-bold ${isWin ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                                  {isWin ? '+' : '-'}${Math.abs(pnlValue).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-500 font-mono">No history found for this filter.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Right Column: NFT & Active Positions */}
              <div className="col-span-12 lg:col-span-4 space-y-8">
                
                {/* NFT Prediction Pass */}
                <div className="glass-card p-1 border-[#fbbf24]/30 bg-gradient-to-br from-[#fbbf24]/20 to-transparent relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[#fbbf24] blur-[100px] opacity-10"></div>
                  <div className="bg-[#020817] p-5 h-full relative z-10 border border-white/5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-[#fbbf24]/10 rounded border border-[#fbbf24]/30 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl text-[#fbbf24]">stars</span>
                      </div>
                      <span className="font-mono text-[9px] font-bold tracking-widest text-[#fbbf24] border border-[#fbbf24]/30 px-2 py-0.5 rounded uppercase">
                        ARC ALPHA PASS
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-lg mb-2">Genesis Member</h3>
                    <p className="text-slate-400 text-xs leading-relaxed mb-6">
                      Mint your on-chain prediction pass to unlock zero-fee trading and private Discord access.
                    </p>
                    
                    {profile?.nftMinted ? (
                      <div className="w-full text-center py-3 border border-[#34d399]/30 bg-[#34d399]/10 text-[#34d399] font-mono text-xs font-bold tracking-widest rounded">
                        MINTED & ACTIVE
                      </div>
                    ) : (
                      <button className="w-full text-center py-3 bg-[#fbbf24] text-[#020817] font-mono text-xs font-black tracking-widest rounded hover:shadow-[0_0_15px_rgba(251,191,36,0.4)] transition-all">
                        MINT PASS (0.05 ETH)
                      </button>
                    )}
                  </div>
                </div>

                {/* Active Positions */}
                <div className="glass-card p-6 bg-[#0a1628]/80 border-white/5">
                  <h3 className="font-mono text-sm font-bold text-slate-300 mb-6 tracking-widest uppercase flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#38bdf8]">radar</span>
                    Active Positions
                  </h3>
                  
                  <div className="space-y-3">
                    {stakes.length > 0 ? (
                      stakes.slice(0, 3).map((stake) => (
                        <div key={`active-${stake.id}`} className="p-3 border border-white/10 bg-white/[0.02] hover:border-[#38bdf8]/30 transition-colors">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-mono text-[10px] tracking-widest text-slate-400">MARKET #{stake.marketId.substring(0,6)}</span>
                            <span className={`font-mono text-[10px] tracking-widest font-bold px-1.5 py-0.5 rounded ${
                              stake.side === 0 ? 'bg-[#34d399]/10 text-[#34d399]' : 'bg-[#f87171]/10 text-[#f87171]'
                            }`}>
                              {stake.side === 0 ? 'FOLLOW' : 'FADE'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white font-bold text-sm truncate pr-2">Awaiting Resolution</span>
                            <span className="font-mono text-[#38bdf8] font-bold">${stake.amountUsdc.toLocaleString()}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 border border-white/5 border-dashed text-center">
                        <span className="font-mono text-xs text-slate-500">No active positions.</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
