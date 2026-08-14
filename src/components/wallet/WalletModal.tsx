'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Monitor, ShieldCheck, Wallet, X } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { useWallet } from '@/hooks/useWallet';
import type { Connector } from 'wagmi';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WalletBrand = 'metamask' | 'walletconnect' | 'coinbase' | 'rabby' | 'okx' | 'phantom' | 'trust' | 'generic';

interface WalletOption {
  brand: WalletBrand;
  label: string;
  description: string;
  connector?: Connector;
  href?: string;
}

const LAST_WALLET_KEY = 'arcsignal:last-wallet';
const INSTALL_OPTIONS: WalletOption[] = [
  {
    brand: 'phantom',
    label: 'Phantom',
    description: 'Install the browser extension',
    href: 'https://phantom.app/download',
  },
  {
    brand: 'trust',
    label: 'Trust Wallet',
    description: 'Install the browser extension',
    href: 'https://trustwallet.com/browser-extension',
  },
];

function getWalletBrand(connector: Connector): WalletBrand {
  const id = connector.id.toLowerCase();
  const name = connector.name.toLowerCase();

  if (id === 'injected' || name.includes('metamask')) return 'metamask';
  if (name.includes('walletconnect')) return 'walletconnect';
  if (name.includes('coinbase')) return 'coinbase';
  if (name.includes('rabby')) return 'rabby';
  if (name.includes('okx')) return 'okx';
  if (name.includes('phantom')) return 'phantom';
  if (name.includes('trust')) return 'trust';
  return 'generic';
}

function getConnectorLabel(connector: Connector): string {
  const brand = getWalletBrand(connector);
  if (brand === 'metamask') return 'MetaMask';
  if (brand === 'walletconnect') return 'WalletConnect';
  if (brand === 'coinbase') return 'Coinbase Wallet';
  if (brand === 'rabby') return 'Rabby Wallet';
  if (brand === 'okx') return 'OKX Wallet';
  if (brand === 'phantom') return 'Phantom';
  if (brand === 'trust') return 'Trust Wallet';
  return connector.name;
}

function getDescription(brand: WalletBrand, isRecent: boolean) {
  if (isRecent) return 'Recently used on ArcSignal';
  if (brand === 'walletconnect') return 'QR or mobile wallet';
  if (brand === 'coinbase') return 'Extension, QR, or mobile';
  if (brand === 'generic') return 'Available wallet connector';
  return 'Detected in this browser';
}

function brandRank(brand: WalletBrand) {
  if (brand === 'rabby') return 0;
  if (brand === 'okx') return 1;
  if (brand === 'metamask') return 2;
  if (brand === 'walletconnect') return 3;
  if (brand === 'coinbase') return 4;
  if (brand === 'phantom') return 5;
  if (brand === 'trust') return 6;
  return 7;
}

function getErrorMessage(err: unknown) {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  if (lower.includes('reject') || lower.includes('denied')) return 'Connection rejected. Try again.';
  if (lower.includes('timeout') || lower.includes('timed out')) return "Wallet didn't respond. Check the extension.";
  if (lower.includes('not found') || lower.includes('provider')) return 'Wallet extension not detected.';
  return 'Connection failed. Try again.';
}

function WalletLogo({ brand }: { brand: WalletBrand }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#141414] shadow-inner">
      {brand === 'metamask' && (
        <svg viewBox="0 0 318.6 318.6" width="30" height="30" role="img" fill="none">
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
        <svg viewBox="0 0 48 48" width="30" height="30" role="img">
          <circle cx="24" cy="24" r="22" fill="#3B99FC" />
          <path fill="#fff" d="M14.7 20.5c5.1-5 13.4-5 18.5 0l.6.6a.6.6 0 0 1 0 .9l-2.1 2.1a.6.6 0 0 1-.9 0l-.9-.9c-3.3-3.2-8.6-3.2-11.9 0l-1 .9a.6.6 0 0 1-.8 0L14.1 22a.6.6 0 0 1 0-.9zm22.9 4 1.9 1.9a.6.6 0 0 1 0 .9l-8.4 8.3a.6.6 0 0 1-.8 0l-6-5.9a.3.3 0 0 0-.4 0l-6 5.9a.6.6 0 0 1-.8 0l-8.4-8.3a.6.6 0 0 1 0-.9l1.9-1.9a.6.6 0 0 1 .9 0l6 6a.3.3 0 0 0 .4 0l6-6a.6.6 0 0 1 .9 0l6 6a.3.3 0 0 0 .4 0l6-6a.6.6 0 0 1 .8 0z" />
        </svg>
      )}
      {brand === 'coinbase' && (
        <svg viewBox="0 0 48 48" width="30" height="30" role="img">
          <circle cx="24" cy="24" r="22" fill="#0052FF" />
          <path fill="#fff" d="M24 34.5c-5.8 0-10.5-4.7-10.5-10.5S18.2 13.5 24 13.5c5.2 0 9.5 3.8 10.3 8.7H27a3.7 3.7 0 0 0-3-1.5 3.3 3.3 0 1 0 0 6.6 3.7 3.7 0 0 0 3-1.5h7.3c-.8 4.9-5.1 8.7-10.3 8.7z" />
        </svg>
      )}
      {brand === 'rabby' && (
        <svg viewBox="0 0 48 48" width="30" height="30" role="img" fill="none">
          <rect x="6" y="9" width="36" height="30" rx="14" fill="#7C8CFF" />
          <path fill="#EEF2FF" d="M14 24c0-8 5-13 10-13s10 5 10 13v3c0 6-4 10-10 10s-10-4-10-10z" />
          <path fill="#EEF2FF" d="M17 16 12 10c-.5-.6-.1-1.5.7-1.4l8 1.1zM31 16l5-6c.5-.6.1-1.5-.7-1.4l-8 1.1z" />
          <path fill="#7181F4" d="M11 25c6-5 12-5 18-1 3 2 6 2 8 1-2 7-7 11-14 11-6 0-10-4-12-11z" />
          <circle cx="20" cy="25" r="2" fill="#fff" />
          <circle cx="28" cy="25" r="2" fill="#fff" />
        </svg>
      )}
      {brand === 'okx' && (
        <svg viewBox="0 0 48 48" width="30" height="30" role="img">
          <rect width="48" height="48" rx="12" fill="#050505" />
          <path fill="#fff" d="M10 10h10v10H10zM28 10h10v10H28zM19 19h10v10H19zM10 28h10v10H10zM28 28h10v10H28z" />
        </svg>
      )}
      {brand === 'phantom' && (
        <svg viewBox="0 0 48 48" width="30" height="30" role="img">
          <rect width="48" height="48" rx="12" fill="#AB9FF2" />
          <path fill="#fff" d="M12 28.2c0-9.3 6.9-16.2 16-16.2 8.6 0 14 5.8 14 13.8 0 6.4-3.8 10.9-8.7 10.9-2 0-3.5-.8-4.3-2.1-1.3 1.8-3.3 2.9-5.7 2.9H12z" />
          <circle cx="31.5" cy="23.5" r="1.8" fill="#AB9FF2" />
          <circle cx="37" cy="23.5" r="1.8" fill="#AB9FF2" />
        </svg>
      )}
      {brand === 'trust' && (
        <svg viewBox="0 0 48 48" width="30" height="30" role="img">
          <path fill="#0500FF" d="M24 5 39 10v11c0 10.4-5.8 18.1-15 22-9.2-3.9-15-11.6-15-22V10z" />
          <path fill="#16C8FF" d="M24 5v38c9.2-3.9 15-11.6 15-22V10z" />
        </svg>
      )}
      {brand === 'generic' && <Wallet size={24} className="text-[#ddb7ff]" strokeWidth={1.8} />}
    </span>
  );
}

function StatusPill({ status, isPending }: { status: 'ready' | 'connect' | 'install'; isPending: boolean }) {
  if (isPending) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ddb7ff]/20 border border-[#ddb7ff]/40 px-2.5 py-1 text-xs font-semibold text-[#ddb7ff] shadow-[0_0_10px_rgba(221,183,255,0.2)]">
        <Loader2 size={12} className="animate-spin" />
        Connecting
      </span>
    );
  }

  if (status === 'ready') {
    return (
      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-mono font-bold text-emerald-400">
        Ready
      </span>
    );
  }

  if (status === 'connect') {
    return (
      <span className="rounded-full bg-[#ddb7ff]/15 border border-[#ddb7ff]/30 px-2.5 py-1 text-xs font-mono font-bold text-[#ddb7ff] group-hover:bg-[#ddb7ff] group-hover:text-[#131313] transition-all">
        Connect
      </span>
    );
  }

  return (
    <span className="rounded-full bg-white/[0.05] border border-white/[0.08] px-2.5 py-1 text-xs font-mono font-medium text-[#94a3b8]">
      Install
    </span>
  );
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connect, connectors } = useWallet();
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ key: string; message: string } | null>(null);
  const [lastWalletUid, setLastWalletUid] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLastWalletUid(window.localStorage.getItem(LAST_WALLET_KEY));

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pendingUid) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, pendingUid]);

  useEffect(() => {
    if (!pendingUid) return;

    const timeout = window.setTimeout(() => {
      setRowError({ key: pendingUid, message: "Wallet didn't respond. Check the extension." });
      setPendingUid(null);
    }, 15000);

    return () => window.clearTimeout(timeout);
  }, [pendingUid]);

  const walletOptions = useMemo(() => {
    const detected = connectors.map((connector): WalletOption => {
      const brand = getWalletBrand(connector);
      return {
        brand,
        connector,
        label: getConnectorLabel(connector),
        description: getDescription(brand, connector.uid === lastWalletUid),
      };
    });
    const detectedBrands = new Set(detected.map((option) => option.brand));
    const installOnly = INSTALL_OPTIONS.filter((option) => !detectedBrands.has(option.brand));

    return [...detected, ...installOnly].sort(
      (a, b) => brandRank(a.brand) - brandRank(b.brand) || a.label.localeCompare(b.label)
    );
  }, [connectors, lastWalletUid]);

  if (!isOpen) return null;

  const readyCount = walletOptions.filter((option) => option.connector).length;

  const handleConnect = (option: WalletOption) => {
    if (!option.connector) {
      if (option.href) window.open(option.href, '_blank', 'noopener,noreferrer');
      return;
    }
    if (pendingUid) return;

    setRowError(null);
    setPendingUid(option.connector.uid);

    try {
      connect(
        { connector: option.connector },
        {
          onSuccess: () => {
            window.localStorage.setItem(LAST_WALLET_KEY, option.connector!.uid);
            setPendingUid(null);
            onClose();
          },
          onError: (err) => {
            setPendingUid(null);
            setRowError({ key: option.connector!.uid, message: getErrorMessage(err) });
          },
        }
      );
    } catch (err) {
      setPendingUid(null);
      setRowError({ key: option.connector.uid, message: getErrorMessage(err) });
    }
  };

  const renderWalletOption = (option: WalletOption) => {
    const key = option.connector?.uid ?? option.brand;
    const isPending = pendingUid === key;
    const disabled = !!pendingUid && !isPending;
    const isRecentlyUsed = option.connector?.uid === lastWalletUid;
    const status = option.connector ? (option.brand === 'metamask' || option.brand === 'walletconnect' || option.brand === 'coinbase' ? 'connect' : 'ready') : 'install';
    const error = rowError?.key === key ? rowError.message : null;

    return (
      <div key={key}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleConnect(option)}
          className="group flex min-h-[92px] w-full items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-[#1c1b1b] px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ddb7ff]/40 hover:bg-[#232228] hover:shadow-[0_0_20px_rgba(183,109,255,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <WalletLogo brand={option.brand} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm sm:text-base font-bold text-white group-hover:text-[#ddb7ff] transition-colors">
              {option.label}
              {isRecentlyUsed && (
                <span className="rounded-full bg-[#ddb7ff]/20 border border-[#ddb7ff]/40 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-[#ddb7ff]">
                  Last
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-xs leading-4 text-[#94a3b8]">{option.description}</span>
            {error && <span className="mt-1.5 block text-xs font-medium text-rose-400">{error}</span>}
          </span>
          <StatusPill status={status} isPending={isPending} />
          {!option.connector && <ExternalLink size={14} className="hidden text-[#94a3b8] sm:block group-hover:text-white transition-colors" />}
        </button>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => {
        if (!pendingUid) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-modal-title"
        className="relative flex max-h-[92vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[24px] border border-white/[0.1] bg-[#141414] text-[#e5e2e1] shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(183,109,255,0.1)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Glowing top line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ddb7ff] to-transparent z-10" />

        {/* Modal Header */}
        <div className="bg-gradient-to-b from-[#211b2b] via-[#18161f] to-[#141414] px-6 pb-6 pt-6 sm:px-8 sm:pt-7 border-b border-white/[0.08]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ddb7ff]/15 border border-[#ddb7ff]/30 text-[#ddb7ff] shadow-[0_0_15px_rgba(221,183,255,0.2)]">
                <Logo className="h-5 w-5" />
              </span>
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#ddb7ff]">
                ArcSignal Portal
              </span>
            </div>
            <button
              type="button"
              disabled={!!pendingUid}
              onClick={onClose}
              aria-label="Close wallet modal"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-[#94a3b8] transition-all hover:bg-white/10 hover:text-white hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>

          <h2 id="wallet-modal-title" className="mt-5 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Connect wallet
          </h2>
          <p className="mt-1.5 text-sm sm:text-base text-[#94a3b8] leading-relaxed">
            Choose how you want to sign in. No transaction required.
          </p>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto custom-scrollbar px-6 pb-6 pt-5 sm:px-8">
          <div className="flex items-center gap-3.5 rounded-xl border border-white/[0.08] bg-[#1c1b1b] px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[#ddb7ff]">
              <Monitor size={20} />
            </span>
            <div>
              <div className="text-sm font-bold text-white">Choose a browser wallet</div>
              <div className="text-xs text-[#94a3b8]">Detected extensions are shown first.</div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between px-1 font-mono text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
            <span>Wallets</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {readyCount} Ready
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {walletOptions.map(renderWalletOption)}
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#4fdbc8]/20 bg-[#4fdbc8]/5 px-4 py-3 text-xs leading-relaxed text-[#cbd5e1]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#4fdbc8]" />
            <p>
              <strong className="font-bold text-[#4fdbc8]">Sign-in only.</strong> Connecting asks for a signature. It never moves funds or costs gas.
            </p>
          </div>

          <div className="mt-4 text-center text-[11px] text-[#64748b]">
            By connecting, you agree to our{' '}
            <a href="/terms" className="font-semibold text-[#ddb7ff] hover:text-white underline-offset-2 hover:underline transition-colors">Terms</a>
            {' '}and{' '}
            <a href="/privacy" className="font-semibold text-[#ddb7ff] hover:text-white underline-offset-2 hover:underline transition-colors">Privacy Policy</a>.
          </div>
        </div>
      </div>
    </div>
  );
}
