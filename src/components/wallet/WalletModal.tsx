'use client';

import React, { useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import type { Connector } from 'wagmi';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connect, connectors } = useWallet();

  // Escape key support
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConnect = (connector: Connector) => {
    connect({ connector });
    onClose();
  };

  // Sort connectors: injected (MetaMask) first
  const sortedConnectors = [...connectors].sort((a, b) => {
    if (a.id === 'injected') return -1;
    if (b.id === 'injected') return 1;
    return 0;
  });

  const getConnectorLabel = (connector: Connector): string => {
    if (connector.id === 'injected') return 'MetaMask';
    return connector.name;
  };

  const getIconContent = (connector: Connector) => {
    const id = connector.id;
    const name = connector.name.toLowerCase();

    if (id === 'injected' || name.includes('metamask')) {
      return (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: 'rgba(232,118,27,0.2)',
            color: '#E8761B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          MM
        </div>
      );
    }
    if (name.includes('walletconnect')) {
      return (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: 'rgba(59,130,246,0.2)',
            color: '#60a5fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          WC
        </div>
      );
    }
    if (name.includes('coinbase')) {
      return (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: 'rgba(37,99,235,0.2)',
            color: '#93c5fd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          CB
        </div>
      );
    }
    return (
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: '#27272a',
          color: '#a1a1aa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        {connector.name.substring(0, 2).toUpperCase()}
      </div>
    );
  };

  return (
    // Backdrop — full-screen overlay, click to close
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      {/* Modal panel — stop propagation so inner clicks don't close */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-modal-title"
        style={{
          position: 'relative',
          width: '420px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          backgroundColor: '#141414',
          border: '1px solid #1f1f1f',
          borderRadius: 16,
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid #1f1f1f',
            backgroundColor: '#141414',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <h2
            id="wallet-modal-title"
            style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: 0 }}
          >
            Connect Wallet
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#71717a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 6,
              borderRadius: 8,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#71717a'; }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable wallet list */}
        <div
          style={{
            overflowY: 'auto',
            flex: 1,
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {sortedConnectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => handleConnect(connector)}
              style={{
                width: '100%',
                height: 56,
                backgroundColor: '#1a1a1a',
                border: '1px solid #1f1f1f',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: 12,
                cursor: 'pointer',
                transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#06b6d4'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1f1f1f'; }}
            >
              {getIconContent(connector)}
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
              <ChevronRight size={18} style={{ color: '#52525b', flexShrink: 0 }} />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            backgroundColor: '#0d0d0d',
            borderTop: '1px solid #1f1f1f',
            textAlign: 'center',
          }}
        >
          <p style={{ color: '#52525b', fontSize: 12, margin: 0 }}>
            By connecting you agree to the Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
}
