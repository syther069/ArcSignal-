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
        <svg viewBox="0 0 48 48" width="30" height="30" role="img">
          <path fill="#E2761B" d="M43.1 5.1 28.1 16.2l2.8-6.6z" />
          <path fill="#E4761B" d="M4.8 5.1 19.7 16.3 17 9.6z" />
          <path fill="#F6851B" d="m37.7 33.1-4 6.1 8.5 2.3 2.4-8.2zM3.4 33.3l2.4 8.2 8.5-2.3-4-6.1z" />
          <path fill="#763D16" d="m13.8 22.8-2.4 3.7 8.4.4-.3-9zM34.1 22.8l-5.8-5-.2 9 8.4-.4z" />
          <path fill="#E2761B" d="m14.3 39.2 5.1-2.5-4.4-3.4zM28.5 36.7l5.2 2.5-.8-5.9z" />
          <path fill="#CD6116" d="m33.7 39.2-5.2-2.5.4 3.4v1.4zM14.3 39.2l4.8 2.3v-1.4l.3-3.4z" />
          <path fill="#233447" d="m19.2 31.1-4.2-1.2 3 1.4zM28.7 31.1l1.3.2 3-1.4z" />
          <path fill="#CC6228" d="m14.3 39.2.8-6.1-4.8.2zM32.8 33.1l.9 6.1 4-5.9z" />
          <path fill="#E4751F" d="m36.5 26.4-8.4.4.8 4.3 1.3-1.2 3 1.4zM15 31.3l3-1.4 1.2 1.2.8-4.3-8.6-.4z" />
          <path fill="#F6851B" d="m11.4 26.4 3.6 6.9-.1-2zM33.1 31.3v2l3.4-6.9zM20 26.8l-.8 4.3 1 5.1.2-6.7zM28.1 26.8l-.4 2.6.2 6.8 1-5.1z" />
          <path fill="#C0AD9E" d="m28.9 31.1-1 5.1.7.5 4.3-3.4.2-2zM14.9 31.3l.1 2 4.4 3.4.8-.5-1-5.1z" />
          <path fill="#161616" d="m28.9 41.5v-1.4l-.7-.6h-8.5l-.6.6v1.4l-4.8-2.3 1.7 1.4 3.6 2.5h8.7l3.7-2.5 1.7-1.4z" />
          <path fill="#763D16" d="m28.5 36.7-.7-.5h-7.6l-.8.5-.3 3.4.6-.6h8.5l.7.6z" />
          <path fill="#F6851B" d="m43.7 16.9 1.3-6.2-1.9-5.6-14.6 10.8 5.6 4.7 7.9 2.3 1.7-2-.7-.5 1.1-1-.9-.7 1.1-.8zM2.9 10.7l1.3 6.2-.8 1 1.1.8-.9.7 1.1 1-.7.5 1.7 2 7.9-2.3 5.6-4.7L4.8 5.1z" />
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
        <svg viewBox="0 0 48 48" width="30" height="30" role="img">
          <rect x="5" y="7" width="38" height="34" rx="12" fill="#F97316" />
          <path fill="#FFEDD5" d="M15 22c0-6.1 4-10.5 9-10.5S33 15.9 33 22v5.3c0 5.4-3.7 9.2-9 9.2s-9-3.8-9-9.2z" />
          <path fill="#FFEDD5" d="M15.5 16.7 11 11.8c-.4-.4-.2-1.1.4-1.2l7.4-.8zM32.5 16.7l4.5-4.9c.4-.4.2-1.1-.4-1.2l-7.4-.8z" />
          <circle cx="20" cy="24" r="2.2" fill="#1F2937" />
          <circle cx="28" cy="24" r="2.2" fill="#1F2937" />
          <path stroke="#1F2937" strokeLinecap="round" strokeWidth="2" d="M21.5 30c1.5 1.2 3.5 1.2 5 0" />
        </svg>
      )}
      {brand === 'okx' && (
        <svg viewBox="0 0 48 48" width="30" height="30" role="img">
          <rect width="48" height="48" rx="24" fill="#fff" />
          <path fill="#111" d="M10 10h10v10H10zM28 10h10v10H28zM19 19h10v10H19zM10 28h10v10H10zM28 28h10v10H28z" />
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
