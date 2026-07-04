import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Inter, JetBrains_Mono, Hanken_Grotesk } from 'next/font/google';
import Navbar from '@/components/layout/Navbar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Web3Provider } from '@/components/layout/Web3Provider';
import NetworkSwitcher from '@/components/wallet/NetworkSwitcher';
import './globals.css';

const LiveTicker = dynamic(() => import('@/components/layout/LiveTicker'), {
  ssr: false,
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ArcSignal',
  description: 'AI-powered prediction markets on ARC Network',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${jetBrainsMono.variable} ${inter.variable} ${hankenGrotesk.variable}`}
    >
      <body>
        <Web3Provider>
          <Navbar />
          <LiveTicker />
          <NetworkSwitcher />
          {children}
          <MobileBottomNav />
        </Web3Provider>
      </body>
    </html>
  );
}
