import { Geist } from 'next/font/google';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import styles from './TradingDesign.module.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-trading-body', display: 'swap' });

// Applied only by the seven trading surfaces; other pages retain their theme.
export const tradingDesign = `${geist.variable} ${styles.scope}`;

const motionQuery = '(prefers-reduced-motion: reduce)';
const subscribeMotion = (notify: () => void) => {
  const media = window.matchMedia(motionQuery);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};
export function useTradingMotion() {
  return !useSyncExternalStore(subscribeMotion, () => window.matchMedia(motionQuery).matches, () => true);
}

export function useTradingDialog(isOpen: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!isOpen || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const targets = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
    (targets()[0] ?? dialog).focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = targets();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        event.preventDefault(); first.focus();
      }
    };
    dialog.addEventListener('keydown', trap);
    return () => { dialog.removeEventListener('keydown', trap); previous?.focus(); };
  }, [isOpen]);
  return ref;
}
