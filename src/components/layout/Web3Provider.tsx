'use client';

import dynamic from 'next/dynamic';

const Web3ProviderClient = dynamic(
  () => import('./Web3ProviderClient').then((mod) => mod.Web3ProviderClient),
  { ssr: false },
);

export function Web3Provider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <Web3ProviderClient>{children}</Web3ProviderClient>;
}
