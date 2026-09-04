'use client';

import { useCallback, useState, type ComponentType } from 'react';
import type { FundUSDCModalProps } from '@/components/wallet/FundUSDCModal';

let cachedModal: ComponentType<FundUSDCModalProps> | null = null;

export function useFundUSDCModalLoader() {
  const [FundUSDCModal, setFundUSDCModal] = useState<ComponentType<FundUSDCModalProps> | null>(
    () => cachedModal,
  );

  const loadFundUSDCModal = useCallback(async () => {
    const loadedModal = cachedModal ??
      (await import('@/components/wallet/FundUSDCModal')).default;
    cachedModal = loadedModal;
    setFundUSDCModal(() => loadedModal);
    return loadedModal;
  }, []);

  return { FundUSDCModal, loadFundUSDCModal };
}
