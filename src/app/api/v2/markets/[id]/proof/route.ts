import { NextResponse } from 'next/server';
import { validMarketId, V2_CACHE_HEADERS, v2UnavailableResponse } from '@/lib/v2-api';
import { getV2Market, getV2MarketEvents, v2Availability } from '@/lib/v2-repository';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!v2Availability().enabled) return v2UnavailableResponse();
  const { id } = await params;
  if (!validMarketId(id)) return NextResponse.json({ error: 'Invalid V2 market ID' }, { status: 400 });
  try {
    const market = await getV2Market(id);
    if (!market) return NextResponse.json({ error: 'V2 market not found' }, { status: 404 });
    const events = await getV2MarketEvents(market);
    return NextResponse.json({
      ...v2Availability(),
      marketId: market.marketId,
      commitments: {
        protocolVersion: market.protocolVersion,
        metadataSchemaVersion: market.metadataSchemaVersion,
        categoryId: market.categoryId,
        categoryVersion: market.categoryVersion,
        oraclePolicyId: market.oraclePolicyId,
        oraclePolicyVersion: market.oraclePolicyVersion,
        feeVersion: market.feeVersion,
        termsHash: market.termsHash,
        resolutionSourceHash: market.resolutionSourceHash,
        ancillaryDataHash: market.ancillaryDataHash,
        metadataURI: market.metadataURI,
      },
      contracts: {
        market: market.marketAddress,
        amm: market.ammAddress,
        yesToken: market.yesTokenAddress,
        noToken: market.noTokenAddress,
        collateral: market.collateralAddress,
        oracleAdapter: market.oracleAdapterAddress,
      },
      indexedThroughBlock: market.updatedBlock,
      events,
    }, { headers: V2_CACHE_HEADERS });
  } catch (error) {
    console.error('V2 proof API failed:', error);
    return NextResponse.json({ error: 'V2 proof index is unavailable' }, { status: 503 });
  }
}
