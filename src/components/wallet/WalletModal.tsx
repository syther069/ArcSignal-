'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, ShieldCheck, Wallet, X, ChevronRight, AlertCircle } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { useWallet } from '@/hooks/useWallet';
import type { Connector } from 'wagmi';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WalletBrand = 'rabby' | 'metamask' | 'coinbase' | 'okx' | 'walletconnect' | 'phantom' | 'trust' | 'generic';

interface WalletOption {
  key: string;
  brand: WalletBrand;
  label: string;
  description: string;
  iconUrl?: string;
  connector?: Connector;
  href?: string;
}

const LAST_WALLET_KEY = 'arcsignal:last-wallet';

const INSTALL_OPTIONS: WalletOption[] = [
  {
    key: 'phantom-install',
    brand: 'phantom',
    label: 'Phantom',
    description: 'Solana & EVM wallet',
    href: 'https://phantom.app/download',
  },
  {
    key: 'trust-install',
    brand: 'trust',
    label: 'Trust Wallet',
    description: 'Multi-chain mobile & web',
    href: 'https://trustwallet.com/browser-extension',
  },
];

function safeGetStorage(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Ignore localStorage errors in private / sandboxed mode
  }
  return null;
}

function safeSetStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore
  }
}

function getWalletBrand(connector?: Connector | null): WalletBrand {
  if (!connector) return 'generic';
  const id = String(connector.id || '').toLowerCase();
  const name = String(connector.name || '').toLowerCase();

  if (id.includes('rabby') || name.includes('rabby')) return 'rabby';
  if (id.includes('metamask') || name.includes('metamask') || id === 'injected') return 'metamask';
  if (id.includes('coinbase') || name.includes('coinbase')) return 'coinbase';
  if (id.includes('okx') || id.includes('okex') || name.includes('okx')) return 'okx';
  if (id.includes('walletconnect') || name.includes('walletconnect')) return 'walletconnect';
  if (id.includes('phantom') || name.includes('phantom')) return 'phantom';
  if (id.includes('trust') || name.includes('trust')) return 'trust';
  return 'generic';
}

function getConnectorLabel(connector?: Connector | null): string {
  if (!connector) return 'Unknown Wallet';
  const brand = getWalletBrand(connector);
  if (brand === 'rabby') return 'Rabby Wallet';
  if (brand === 'metamask') return 'MetaMask';
  if (brand === 'coinbase') return 'Coinbase Wallet';
  if (brand === 'okx') return 'OKX Wallet';
  if (brand === 'walletconnect') return 'WalletConnect';
  if (brand === 'phantom') return 'Phantom';
  if (brand === 'trust') return 'Trust Wallet';
  return String(connector.name || 'Browser Wallet');
}

function getDescription(brand: WalletBrand, isRecent: boolean, isDetected: boolean) {
  if (isRecent) return 'Recent';
  if (brand === 'walletconnect') return 'QR & mobile';
  if (isDetected) return 'Detected';
  return 'Available';
}

function brandRank(brand: WalletBrand): number {
  switch (brand) {
    case 'rabby': return 1;
    case 'metamask': return 2;
    case 'okx': return 3;
    case 'coinbase': return 4;
    case 'walletconnect': return 5;
    case 'phantom': return 6;
    case 'trust': return 7;
    default: return 8;
  }
}

function getErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || '');
  const lower = raw.toLowerCase();
  if (lower.includes('reject') || lower.includes('denied') || lower.includes('user cancel')) {
    return 'Connection rejected in wallet.';
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return "Wallet didn't respond. Please check your extension.";
  }
  if (lower.includes('not found') || lower.includes('provider')) {
    return 'Wallet extension not detected.';
  }
  return 'Connection failed. Please try again.';
}

function WalletIcon({ brand, iconUrl }: { brand: WalletBrand; iconUrl?: string }) {
  if (iconUrl) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#141414] p-1.5 shadow-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconUrl} alt={brand} className="h-full w-full object-contain rounded-lg" />
      </span>
    );
  }

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#141414] shadow-inner">
      {brand === 'metamask' && (
        <svg viewBox="0 0 318.6 318.6" width="22" height="22" role="img" fill="none">
          <path fill="#E17726" d="m274.1 35.5-99.5 73.9L194 65.4z" />
          <path fill="#E27625" d="m44.5 35.5 98.9 74.5-18.7-44.6z" />
          <path fill="#E27625" d="m238.3 206.8-27.4 41.6 57.6 15.8 16.5-56.6z" />
          <path fill="#E27625" d="m33.6 207.6 16.4 56.6 57.8-15.8-27.5-41.6z" />
          <path fill="#E27625" d="m93.6 136.2-16.1 24.3 56.4 2.5-.9-60.6z" />
          <path fill="#E27625" d="m225 136.2-39.9-34.3-.8 61.1 56.8-2.5z" />
          <path fill="#F5841F" d="m96.7 247.6 34.7-16.8-29.6-23.1z" />
          <path fill="#F5841F" d="m187.2 230.8 34.6 16.8-5.1-40.4z" />
          <path fill="#763D16" d="m221.8 247.6-34.6-16.8 2.6 22.9v9.7z" />
          <path fill="#763D16" d="m96.7 247.6 32 15.8v-9.7l2.6-22.9z" />
          <path fill="#F5841F" d="m129.5 220.8-27.7-8.1 19.8 9.5z" />
          <path fill="#F5841F" d="m189.1 220.8 8.6-1.4 19.2 9.5z" />
          <path fill="#C0AD9E" d="m96.7 247.6 5.1-40.9-32.3 1.2z" />
          <path fill="#C0AD9E" d="m216.7 207.9 5.1 40.9 27.2-40.4z" />
          <path fill="#161616" d="m241.8 177.3-56.8 2.5 5.2 28.1 8.6-1.4 20 9.7z" />
          <path fill="#161616" d="m101.8 217.4 19.8-9.7 7.9 1.4 5.2-28.1-56.4-2.5z" />
          <path fill="#763D16" d="m77.5 160.5 24.3 47.4-.5-1.2z" />
          <path fill="#763D16" d="m216.7 207.9v-1.2l24.3-47.4z" />
          <path fill="#F5841F" d="m133.3 162.9-4.8 17.5 6.6 34.3 1.2-45.1z" />
          <path fill="#F5841F" d="m185.3 162.9-3 6.7 1.2 45.1 6.6-34.3z" />
          <path fill="#F5841F" d="m189.8 207.2-6.6 34.3 4.6 2.3 22.9-19.1.5-16.1z" />
          <path fill="#F5841F" d="m101.8 217.4.5 16.1 22.9 19.1 4.6-2.3-6.6-34.3z" />
          <path fill="#393939" d="m189.8 273.4v-9.7l-4.6-2.3h-51.8l-4.6 2.3v9.7l-32.1-15.8 11.5 9.4 24.2 16.8h58.8l24.2-16.8 11.5-9.4z" />
          <path fill="#D7C1B3" d="m187.2 230.8-4.6 3.4-3.5 29.5 4.6 2.3h5.1v-9.7l-1.6-25.5z" />
          <path fill="#D7C1B3" d="m136.3 234.2-4.6-3.4-1.6 25.5v9.7h5.1l4.6-2.3-3.5-29.5z" />
          <path fill="#233447" d="m214.8 176.6-20-9.7-9.5-30.7 39.9 34.3z" />
          <path fill="#233447" d="m93.6 136.2 39.9 30.7-20 9.7-19.9-40.4z" />
          <path fill="#CD6116" d="m278.3 114.2 8.5-41.9-12.7-36.8-98.9 73.9 38.3 32 53.6 15.6 11.8-13.8-4.9-3.5 7.7-6.8-6.1-4.7 7.7-5.5z" />
          <path fill="#CD6116" d="m44.5 35.5-12.7 36.8 8.5 41.9-4.5 1.1 7.7 5.5-6.1 4.7 7.7 6.8-4.9 3.5 11.8 13.8 53.6-15.6 38.3-32z" />
        </svg>
      )}
      {brand === 'walletconnect' && (
        <svg viewBox="0 0 48 48" width="22" height="22" role="img">
          <circle cx="24" cy="24" r="22" fill="#3B99FC" />
          <path fill="#fff" d="M14.7 20.5c5.1-5 13.4-5 18.5 0l.6.6a.6.6 0 0 1 0 .9l-2.1 2.1a.6.6 0 0 1-.9 0l-.9-.9c-3.3-3.2-8.6-3.2-11.9 0l-1 .9a.6.6 0 0 1-.8 0L14.1 22a.6.6 0 0 1 0-.9zm22.9 4 1.9 1.9a.6.6 0 0 1 0 .9l-8.4 8.3a.6.6 0 0 1-.8 0l-6-5.9a.3.3 0 0 0-.4 0l-6 5.9a.6.6 0 0 1-.8 0l-8.4-8.3a.6.6 0 0 1 0-.9l1.9-1.9a.6.6 0 0 1 .9 0l6 6a.3.3 0 0 0 .4 0l6-6a.6.6 0 0 1 .9 0l6 6a.3.3 0 0 0 .4 0l6-6a.6.6 0 0 1 .8 0z" />
        </svg>
      )}
      {brand === 'coinbase' && (
        <svg viewBox="0 0 48 48" width="22" height="22" role="img">
          <circle cx="24" cy="24" r="22" fill="#0052FF" />
          <path fill="#fff" d="M24 34.5c-5.8 0-10.5-4.7-10.5-10.5S18.2 13.5 24 13.5c5.2 0 9.5 3.8 10.3 8.7H27a3.7 3.7 0 0 0-3-1.5 3.3 3.3 0 1 0 0 6.6 3.7 3.7 0 0 0 3-1.5h7.3c-.8 4.9-5.1 8.7-10.3 8.7z" />
        </svg>
      )}
      {brand === 'rabby' && (
        <svg viewBox="0 0 48 48" width="22" height="22" role="img" fill="none">
          <rect x="6" y="9" width="36" height="30" rx="14" fill="#7C8CFF" />
          <path fill="#EEF2FF" d="M14 24c0-8 5-13 10-13s10 5 10 13v3c0 6-4 10-10 10s-10-4-10-10z" />
          <path fill="#EEF2FF" d="M17 16 12 10c-.5-.6-.1-1.5.7-1.4l8 1.1zM31 16l5-6c.5-.6.1-1.5-.7-1.4l-8 1.1z" />
          <path fill="#7181F4" d="M11 25c6-5 12-5 18-1 3 2 6 2 8 1-2 7-7 11-14 11-6 0-10-4-12-11z" />
          <circle cx="20" cy="25" r="2" fill="#fff" />
          <circle cx="28" cy="25" r="2" fill="#fff" />
        </svg>
      )}
      {brand === 'okx' && (
        <svg viewBox="0 0 48 48" width="22" height="22" role="img">
          <rect width="48" height="48" rx="12" fill="#050505" />
          <path fill="#fff" d="M10 10h10v10H10zM28 10h10v10H28zM19 19h10v10H19zM10 28h10v10H10zM28 28h10v10H28z" />
        </svg>
      )}
      {brand === 'phantom' && (
        <svg viewBox="0 0 48 48" width="22" height="22" role="img">
          <rect width="48" height="48" rx="12" fill="#AB9FF2" />
          <path fill="#fff" d="M12 28.2c0-9.3 6.9-16.2 16-16.2 8.6 0 14 5.8 14 13.8 0 6.4-3.8 10.9-8.7 10.9-2 0-3.5-.8-4.3-2.1-1.3 1.8-3.3 2.9-5.7 2.9H12z" />
          <circle cx="31.5" cy="23.5" r="1.8" fill="#AB9FF2" />
          <circle cx="37" cy="23.5" r="1.8" fill="#AB9FF2" />
        </svg>
      )}
      {brand === 'trust' && (
        <svg viewBox="0 0 48 48" width="22" height="22" role="img">
          <path fill="#0500FF" d="M24 5 39 10v11c0 10.4-5.8 18.1-15 22-9.2-3.9-15-11.6-15-22V10z" />
          <path fill="#16C8FF" d="M24 5v38c9.2-3.9 15-11.6 15-22V10z" />
        </svg>
      )}
      {brand === 'generic' && <Wallet size={18} className="text-[#ddb7ff]" strokeWidth={2} />}
    </span>
  );
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connect, connectors } = useWallet();
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastWalletUid, setLastWalletUid] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    setLastWalletUid(safeGetStorage(LAST_WALLET_KEY));

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pendingUid) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, pendingUid]);

  useEffect(() => {
    if (!pendingUid) return;

    const timeout = window.setTimeout(() => {
      setErrorMessage("Wallet didn't respond in time. Please check your extension.");
      setPendingUid(null);
    }, 15000);

    return () => window.clearTimeout(timeout);
  }, [pendingUid]);

  const walletOptions = useMemo(() => {
    try {
      const detected: WalletOption[] = (connectors || []).map((connector, index) => {
        const brand = getWalletBrand(connector);
        const label = getConnectorLabel(connector);
        const uid = connector?.uid || `connector-${index}`;
        const isRecent = !!(lastWalletUid && uid === lastWalletUid);
        return {
          key: uid,
          brand,
          label,
          description: getDescription(brand, isRecent, true),
          iconUrl: (connector as any)?.icon,
          connector,
        };
      });

      const detectedBrands = new Set(detected.map((opt) => opt.brand));
      const installOnly = INSTALL_OPTIONS.filter((opt) => !detectedBrands.has(opt.brand));

      return [...detected, ...installOnly].sort((a, b) => {
        const rankA = brandRank(a.brand);
        const rankB = brandRank(b.brand);
        if (rankA !== rankB) return rankA - rankB;
        return String(a.label || '').localeCompare(String(b.label || ''));
      });
    } catch {
      return [];
    }
  }, [connectors, lastWalletUid]);

  if (!isOpen) return null;

  const handleConnect = (option: WalletOption) => {
    if (!option.connector) {
      if (option.href && typeof window !== 'undefined') {
        window.open(option.href, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    if (pendingUid) return;

    setErrorMessage(null);
    const uid = option.connector.uid || option.key;
    setPendingUid(uid);

    try {
      connect(
        { connector: option.connector },
        {
          onSuccess: () => {
            safeSetStorage(LAST_WALLET_KEY, uid);
            setPendingUid(null);
            onClose();
          },
          onError: (err) => {
            setPendingUid(null);
            setErrorMessage(getErrorMessage(err));
          },
        }
      );
    } catch (err) {
      setPendingUid(null);
      setErrorMessage(getErrorMessage(err));
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150"
      onClick={() => {
        if (!pendingUid) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-modal-title"
        className="relative flex w-full max-w-[390px] flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#141414] text-[#e5e2e1] shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(183,109,255,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Glowing top line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ddb7ff] to-transparent z-10" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#18161f] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ddb7ff]/15 border border-[#ddb7ff]/30 text-[#ddb7ff]">
              <Logo className="h-4 w-4" />
            </span>
            <h2 id="wallet-modal-title" className="font-display text-base font-bold tracking-tight text-white">
              Connect Wallet
            </h2>
          </div>
          <button
            type="button"
            disabled={!!pendingUid}
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#94a3b8] transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex flex-col gap-2">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-300 animate-in fade-in">
              <AlertCircle size={14} className="shrink-0 text-rose-400" />
              <span className="flex-1 leading-4">{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5 max-h-[340px] overflow-y-auto custom-scrollbar pr-0.5">
            {walletOptions.map((option) => {
              const isPending = pendingUid === option.key || (!!option.connector && pendingUid === option.connector.uid);
              const disabled = !!pendingUid && !isPending;
              const isRecent = !!(lastWalletUid && (lastWalletUid === option.key || lastWalletUid === option.connector?.uid));

              return (
                <button
                  key={option.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleConnect(option)}
                  className="group flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-[#1c1b1b] px-3.5 py-2.5 text-left transition-all duration-150 hover:border-[#ddb7ff]/40 hover:bg-[#252424] hover:shadow-[0_0_15px_rgba(183,109,255,0.08)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <WalletIcon brand={option.brand} iconUrl={option.iconUrl} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-white group-hover:text-[#ddb7ff] transition-colors">
                          {option.label}
                        </span>
                        {isRecent && (
                          <span className="rounded-full bg-[#ddb7ff]/20 border border-[#ddb7ff]/30 px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase text-[#ddb7ff]">
                            Recent
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#94a3b8]">{option.description}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ddb7ff]/15 border border-[#ddb7ff]/30 px-2 py-0.5 text-xs font-semibold text-[#ddb7ff]">
                        <Loader2 size={11} className="animate-spin" />
                        <span className="text-[11px]">Connecting</span>
                      </span>
                    ) : option.connector ? (
                      <ChevronRight size={15} className="text-[#64748b] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 text-[10px] font-mono text-[#94a3b8] group-hover:text-white">
                        Install <ExternalLink size={10} />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Security / Sign-in info badge */}
          <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-[#4fdbc8]/20 bg-[#4fdbc8]/5 px-3 py-2 text-[11px] leading-tight text-[#cbd5e1]">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#4fdbc8]" />
            <span>
              <strong className="text-[#4fdbc8]">Sign-in only.</strong> No transaction or gas fee.
            </span>
          </div>

          {/* Footer Terms */}
          <div className="mt-1 text-center text-[10px] text-[#64748b]">
            By connecting, you agree to{' '}
            <a href="/terms" className="text-[#ddb7ff] hover:underline">Terms</a>
            {' '}&{' '}
            <a href="/privacy" className="text-[#ddb7ff] hover:underline">Privacy</a>
          </div>
        </div>
      </div>
    </div>
  );
}
