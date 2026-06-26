import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain, useBalance } from 'wagmi';

export function useWallet() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, status: connectStatus } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: balance } = useBalance({ address });
  
  const isWrongNetwork = isConnected && chain?.id !== 5042002;
  const shortAddress = address 
    ? `${address.slice(0,6)}...${address.slice(-4)}` 
    : null;
  
  if (!mounted) {
    return {
      mounted: false,
      address: undefined,
      isConnected: false,
      chain: undefined,
      connect,
      connectors,
      connectStatus: 'idle',
      disconnect,
      switchChain,
      balance: undefined,
      isWrongNetwork: false,
      shortAddress: null,
    };
  }

  return { 
    mounted: true,
    address, 
    isConnected, 
    chain, 
    connect, 
    connectors,
    connectStatus,
    disconnect, 
    switchChain, 
    balance, 
    isWrongNetwork, 
    shortAddress 
  };
}
