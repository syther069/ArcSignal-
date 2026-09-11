'use client';
import type { ReactNode } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { tradingDesign } from '@/components/layout/TradingDesign';
export default function SignalLayout({ children }: { children: ReactNode }) {
  return <div className={`${tradingDesign} min-h-screen bg-[#131313] text-[#f1eef4]`}><Sidebar /><main className="lg:ml-[264px] px-4 md:px-8 pt-24 pb-24 space-y-6">{children}</main></div>;
}
