import { getMarketById } from '@/lib/frontend-data';
import MarketDetailClient from './MarketDetailClient';
import { notFound } from 'next/navigation';
import { Market } from '@/types';



export const revalidate = 60;

export default async function MarketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let market: Market | null = null;
  
  try {
    market = await getMarketById(params.id);
  } catch (error) {
    console.error('Failed to fetch market details', error);
  }

  if (!market) {
    notFound();
  }

  return <MarketDetailClient market={market} />;
}
