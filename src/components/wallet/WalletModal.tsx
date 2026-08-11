'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Loader2, Wallet, X } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import type { Connector } from 'wagmi';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LAST_WALLET_KEY = 'arcsignal:last-wallet';

type WalletBrand = 'metamask' | 'walletconnect' | 'coinbase' | 'rabby' | 'okx' | 'generic';

function getWalletBrand(connector: Connector): WalletBrand {
  const id = connector.id.toLowerCase();
  const name = connector.name.toLowerCase();

  if (id === 'injected' || name.includes('metamask')) return 'metamask';
  if (name.includes('walletconnect')) return 'walletconnect';
  if (name.includes('coinbase')) return 'coinbase';
  if (name.includes('rabby')) return 'rabby';
  if (name.includes('okx')) return 'okx';
  return 'generic';
}

function getConnectorLabel(connector: Connector): string {
  const brand = getWalletBrand(connector);
  if (brand === 'metamask') return 'MetaMask';
  if (brand === 'walletconnect') return 'WalletConnect';
  if (brand === 'coinbase') return 'Coinbase Wallet';
  if (brand === 'rabby') return 'Rabby Wallet';
  if (brand === 'okx') return 'OKX Wallet';
  return connector.name;
}

function brandRank(connector: Connector) {
  const brand = getWalletBrand(connector);
  if (brand === 'metamask') return 0;
  if (brand === 'coinbase') return 1;
  if (brand === 'walletconnect') return 2;
  if (brand === 'rabby') return 3;
  if (brand === 'okx') return 4;
  return 5;
}

function WalletLogo({ connector }: { connector: Connector }) {
  const brand = getWalletBrand(connector);

  return (
    <span style={logoShellStyle} aria-hidden="true">
      {brand === 'metamask' && (
        <svg viewBox="0 0 318.6 318.6" width="26" height="26" role="img" fill="none">
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
        <svg viewBox="0 0 48 48" width="26" height="26" role="img">
          <circle cx="24" cy="24" r="22" fill="#3B99FC" />
          <path fill="#fff" d="M14.7 20.5c5.1-5 13.4-5 18.5 0l.6.6a.6.6 0 0 1 0 .9l-2.1 2.1a.6.6 0 0 1-.9 0l-.9-.9c-3.3-3.2-8.6-3.2-11.9 0l-1 .9a.6.6 0 0 1-.8 0L14.1 22a.6.6 0 0 1 0-.9zm22.9 4 1.9 1.9a.6.6 0 0 1 0 .9l-8.4 8.3a.6.6 0 0 1-.8 0l-6-5.9a.3.3 0 0 0-.4 0l-6 5.9a.6.6 0 0 1-.8 0l-8.4-8.3a.6.6 0 0 1 0-.9l1.9-1.9a.6.6 0 0 1 .9 0l6 6a.3.3 0 0 0 .4 0l6-6a.6.6 0 0 1 .9 0l6 6a.3.3 0 0 0 .4 0l6-6a.6.6 0 0 1 .8 0z" />
        </svg>
      )}
      {brand === 'coinbase' && (
        <svg viewBox="0 0 48 48" width="26" height="26" role="img">
          <circle cx="24" cy="24" r="22" fill="#0052FF" />
          <path fill="#fff" d="M24 34.5c-5.8 0-10.5-4.7-10.5-10.5S18.2 13.5 24 13.5c5.2 0 9.5 3.8 10.3 8.7H27a3.7 3.7 0 0 0-3-1.5 3.3 3.3 0 1 0 0 6.6 3.7 3.7 0 0 0 3-1.5h7.3c-.8 4.9-5.1 8.7-10.3 8.7z" />
        </svg>
      )}
      {brand === 'rabby' && (
        <svg viewBox="0 0 120 120" width="28" height="28" role="img" fill="none">
          <defs>
            <linearGradient id="rabbyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8697FF" />
              <stop offset="100%" stopColor="#5D73F0" />
            </linearGradient>
            <linearGradient id="rabbyGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
          </defs>
          {/* Rounded Rabby Background */}
          <rect width="120" height="120" rx="30" fill="url(#rabbyGrad)" />
          {/* Bunny Ears */}
          <path
            d="M40 22 C35 15, 26 25, 33 46 C37 55, 46 62, 50 62 C48 48, 44 28, 40 22 Z"
            fill="#FFFFFF"
          />
          <path
            d="M80 22 C85 15, 94 25, 87 46 C83 55, 74 62, 70 62 C72 48, 76 28, 80 22 Z"
            fill="#FFFFFF"
          />
          <path
            d="M39 28 C36 24, 30 30, 35 43 C38 49, 44 54, 46 54 C45 45, 42 32, 39 28 Z"
            fill="#FFD2DE"
            opacity="0.8"
          />
          <path
            d="M81 28 C84 24, 90 30, 85 43 C82 49, 76 54, 74 54 C75 45, 78 32, 81 28 Z"
            fill="#FFD2DE"
            opacity="0.8"
          />
          {/* Bunny Face / Head */}
          <path
            d="M26 68 C26 50, 41 46, 60 46 C79 46, 94 50, 94 68 C94 88, 79 98, 60 98 C41 98, 26 88, 26 68 Z"
            fill="#FFFFFF"
          />
          {/* Cute Sunglasses / Visor Frame */}
          <rect x="33" y="58" width="24" height="20" rx="7" fill="url(#rabbyGlass)" />
          <rect x="63" y="58" width="24" height="20" rx="7" fill="url(#rabbyGlass)" />
          <rect x="54" y="64" width="12" height="4" rx="2" fill="url(#rabbyGlass)" />
          {/* Glass Reflection highlights */}
          <path d="M37 62 L43 62 L39 74 L35 74 Z" fill="#60A5FA" opacity="0.6" />
          <path d="M67 62 L73 62 L69 74 L65 74 Z" fill="#60A5FA" opacity="0.6" />
          {/* Cute Nose and Smile */}
          <ellipse cx="60" cy="83" rx="3" ry="2.2" fill="#FFAEC0" />
          <path
            d="M55 87 Q60 91 65 87"
            stroke="#64748B"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      )}
      {brand === 'okx' && (
        <svg viewBox="0 0 48 48" width="26" height="26" role="img">
          <rect width="48" height="48" rx="12" fill="#111" />
          <path fill="#fff" d="M10 10h10v10H10zM28 10h10v10H28zM19 19h10v10H19zM10 28h10v10H10zM28 28h10v10H28z" />
        </svg>
      )}
      {brand === 'generic' && <Wallet size={22} color="#a1a1aa" strokeWidth={1.8} />}
    </span>
  );
}

const logoShellStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  backgroundColor: '#27272A',
  border: '1px solid #3F3F46',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connect, connectors } = useWallet();
  const [hoveredUid, setHoveredUid] = useState<string | null>(null);
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ uid: string; message: string } | null>(null);
  const [lastWalletUid, setLastWalletUid] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLastWalletUid(window.localStorage.getItem(LAST_WALLET_KEY));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pendingUid) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, pendingUid]);

  useEffect(() => {
    if (!pendingUid) return;
    const timeout = window.setTimeout(() => {
      setRowError({ uid: pendingUid, message: "Wallet didn't respond. Check the extension or app." });
      setPendingUid(null);
    }, 15000);
    return () => window.clearTimeout(timeout);
  }, [pendingUid]);

  const sortedConnectors = useMemo(
    () => [...connectors].sort((a, b) => brandRank(a) - brandRank(b) || getConnectorLabel(a).localeCompare(getConnectorLabel(b))),
    [connectors]
  );

  const recentlyUsed = sortedConnectors.find((connector) => connector.uid === lastWalletUid);
  const recommended = sortedConnectors.find((connector) => getWalletBrand(connector) === 'metamask') ?? sortedConnectors[0];
  const moreOptions = sortedConnectors.filter((connector) =>
    recentlyUsed ? connector.uid !== recentlyUsed.uid : connector.uid !== recommended?.uid
  );

  if (!isOpen) return null;

  const getErrorMessage = (err: unknown) => {
    const raw = err instanceof Error ? err.message : String(err);
    const lower = raw.toLowerCase();
    if (lower.includes('reject') || lower.includes('denied')) return 'Connection rejected. Try again.';
    if (lower.includes('timeout') || lower.includes('timed out')) return "Wallet didn't respond. Check the extension or app.";
    if (lower.includes('not found') || lower.includes('provider')) return 'Wallet extension not detected.';
    return 'Connection failed. Try again.';
  };

  const handleConnect = (connector: Connector) => {
    if (pendingUid) return;
    setRowError(null);
    setPendingUid(connector.uid);

    try {
      connect(
        { connector },
        {
          onSuccess: () => {
            window.localStorage.setItem(LAST_WALLET_KEY, connector.uid);
            setPendingUid(null);
            onClose();
          },
          onError: (err) => {
            setPendingUid(null);
            setRowError({ uid: connector.uid, message: getErrorMessage(err) });
          },
        }
      );
    } catch (err) {
      setPendingUid(null);
      setRowError({ uid: connector.uid, message: getErrorMessage(err) });
    }
  };

  const renderWalletRow = (connector: Connector, options?: { recommended?: boolean; recent?: boolean }) => {
    const isPending = pendingUid === connector.uid;
    const isDisabled = !!pendingUid && !isPending;
    const isHovered = hoveredUid === connector.uid;
    const error = rowError?.uid === connector.uid ? rowError.message : null;

    return (
      <div key={connector.uid}>
        <button
          type="button"
          onClick={() => handleConnect(connector)}
          disabled={isDisabled}
          onMouseEnter={() => setHoveredUid(connector.uid)}
          onMouseLeave={() => setHoveredUid(null)}
          style={{
            width: '100%',
            minHeight: 56,
            backgroundColor: isHovered || isPending ? '#27272A' : 'transparent',
            border: '1px solid #3F3F46',
            borderLeft: isPending ? '2px solid #ddb7ff' : '1px solid #3F3F46',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 12,
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            opacity: isDisabled ? 0.45 : 1,
            transition: 'background-color 150ms ease-out, border-color 150ms ease-out, opacity 150ms ease-out',
          }}
        >
          <WalletLogo connector={connector} />
          <span
            style={{
              color: '#fff',
              fontWeight: 500,
              fontSize: 14,
              flex: 1,
              textAlign: 'left',
            }}
          >
            {getConnectorLabel(connector)}
          </span>
          {options?.recommended && (
            <span
              style={{
                color: '#ddb7ff',
                backgroundColor: 'rgba(221,183,255,0.1)',
                border: '1px solid rgba(221,183,255,0.22)',
                borderRadius: 999,
                padding: '3px 8px',
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              Recommended
            </span>
          )}
          {options?.recent && !isPending && <span style={{ color: '#4fdbc8', fontSize: 16 }}>✓</span>}
          {isPending ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#ddb7ff', fontSize: 12, fontWeight: 500 }}>
              <Loader2 size={14} className="animate-spin" />
              Connecting...
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: isHovered ? '#ddb7ff' : '#71717A', fontSize: 12, fontWeight: 500 }}>
              {isHovered ? 'Connect' : <ArrowRight size={16} />}
            </span>
          )}
        </button>
        {error && <div style={{ color: '#ffb4ab', fontSize: 12, marginTop: 8, paddingLeft: 4 }}>{error}</div>}
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(4px)',
        padding: 16,
      }}
      onClick={() => {
        if (!pendingUid) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-modal-title"
        style={{
          position: 'relative',
          width: 400,
          maxWidth: '100%',
          maxHeight: '86vh',
          backgroundColor: '#18181B',
          border: '1px solid #3F3F46',
          borderRadius: 12,
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            padding: '20px 24px',
            borderBottom: '1px solid #3F3F46',
            backgroundColor: '#18181B',
          }}
        >
          <div>
            <h2 id="wallet-modal-title" style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: 0 }}>
              Connect Wallet
            </h2>
            <p style={{ color: '#A1A1AA', fontSize: 13, lineHeight: '18px', margin: '6px 0 0' }}>
              Link your wallet to start trading on prediction markets.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!!pendingUid}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: pendingUid ? 'not-allowed' : 'pointer',
              color: '#A1A1AA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 6,
              borderRadius: 8,
              opacity: pendingUid ? 0.45 : 1,
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            overflowY: 'auto',
            flex: 1,
            padding: '18px 24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {recentlyUsed ? (
            <section>
              <div style={sectionLabelStyle}>Recently Used</div>
              {renderWalletRow(recentlyUsed, { recent: true })}
            </section>
          ) : (
            recommended && (
              <section>
                <div style={sectionLabelStyle}>Recommended</div>
                {renderWalletRow(recommended, { recommended: true })}
              </section>
            )
          )}

          {moreOptions.length > 0 && (
            <section>
              <div style={sectionLabelStyle}>More Options</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {moreOptions.map((connector) => renderWalletRow(connector))}
              </div>
            </section>
          )}

          <div style={{ fontSize: 12, color: '#A1A1AA' }}>
            Don&apos;t have a wallet?{' '}
            <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" style={{ color: '#ddb7ff', textDecoration: 'none', fontWeight: 500 }}>
              Get started →
            </a>
          </div>
        </div>

        <div
          style={{
            padding: '14px 24px 16px',
            backgroundColor: '#18181B',
            borderTop: '1px solid #3F3F46',
            color: '#A1A1AA',
            fontSize: 11,
            lineHeight: '16px',
          }}
        >
          By connecting, you agree to our{' '}
          <a href="/terms" style={{ color: '#ddb7ff', textDecoration: 'none' }}>Terms</a>
          {' '}and{' '}
          <a href="/privacy" style={{ color: '#ddb7ff', textDecoration: 'none' }}>Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
}

const sectionLabelStyle: React.CSSProperties = {
  color: '#71717A',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 8,
};
