import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Inter, JetBrains_Mono, Hanken_Grotesk } from 'next/font/google';
import Navbar from '@/components/layout/Navbar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Web3Provider } from '@/components/layout/Web3Provider';
import NetworkSwitcher from '@/components/wallet/NetworkSwitcher';
import './globals.css';

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

export const viewport = {
  themeColor: '#131313',
};

import { Toaster } from 'react-hot-toast';

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
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body>
        <Web3Provider>
          <Navbar />
          <NetworkSwitcher />
          {children}
          <MobileBottomNav />
        </Web3Provider>
        <Toaster position="bottom-right" toastOptions={{ style: { background: '#1c1b1b', color: '#fff', border: '1px solid #3a3939' } }} />
      </body>
    </html>
  );
}
