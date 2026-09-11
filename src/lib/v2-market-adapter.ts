import type { Market, MarketCategory, MarketOutcome, MarketStatus, SerializableMarket } from './types';
import type { V2MarketRecord } from './v2-repository';
import { getSql } from './db';

const CATEGORY_BY_ID: Record<number, MarketCategory> = {
  1: 'CRYPTO',
  2: 'SPORTS',
  3: 'POLITICS',
  4: 'TECHNOLOGY',
  5: 'ECONOMICS',
  6: 'CULTURE',
};

function statusFromV2(state: string): MarketStatus {
  if (state === 'RESOLVED') return 'RESOLVED';
  if (state === 'VOIDED') return 'VOIDED';
  if (state === 'CLOSED') return 'PENDING_RESOLUTION';
  return 'OPEN';
}

function outcomeFromV2(outcome: string | null): MarketOutcome {
  if (outcome === 'YES') return 'FOLLOW';
  if (outcome === 'NO') return 'FADE';
  if (outcome === 'UNDETERMINED') return 'CANCELLED';
  return 'PENDING';
}

function parseAnalysis(value: unknown): Market['analysis'] {
  if (!value) return undefined;
  if (typeof value === 'object') return value as Market['analysis'];
  try {
    return JSON.parse(String(value)) as Market['analysis'];
  } catch {
    return undefined;
  }
}

async function getV2DisplayRows(marketIds: string[]) {
  if (marketIds.length === 0) return new Map<string, { question?: string; analysis?: Market['analysis']; category?: string }>();
  const rows = await getSql()`
    select market_id, question, analysis_json, category from markets_index
    where market_id = any(${marketIds})
  `;
  return new Map(rows.map((row) => [
    String(row.market_id),
    {
      question: row.question ? String(row.question) : undefined,
      analysis: parseAnalysis(row.analysis_json),
      category: row.category ? String(row.category) : undefined,
    },
  ]));
}

export async function toSerializableV2Markets(records: V2MarketRecord[]): Promise<SerializableMarket[]> {
  const displayRows = await getV2DisplayRows(records.map((record) => record.marketId));
  return records.map((record) => {
    const display = displayRows.get(record.marketId);
    const category = display?.category
      ? (display.category.toUpperCase() as MarketCategory)
      : CATEGORY_BY_ID[record.categoryId] ?? 'CRYPTO';

    return {
      marketId: record.marketId,
      protocolVersion: 2,
      contractAddress: record.marketAddress,
      category,
      question: display?.question ?? `ArcSignal V2 market ${record.marketId.slice(0, 10)}...`,
      resolutionTime: record.closeTime,
      followPool: record.collateralLiability,
      fadePool: record.collateralLiability,
      resolved: record.marketState === 'RESOLVED' || record.marketState === 'VOIDED',
      outcome: outcomeFromV2(record.outcome),
      status: statusFromV2(record.marketState),
      resolvedAt: record.marketState === 'RESOLVED' || record.marketState === 'VOIDED'
        ? record.resolutionRequestedAt ?? undefined
        : undefined,
      analysis: display?.analysis,
      resolutionReason: record.marketState === 'RESOLVED'
        ? `Resolved through V2 oracle policy ${record.oraclePolicyId}.${record.oraclePolicyVersion}.`
        : record.marketState === 'VOIDED'
          ? 'Voided under the V2 delayed-resolution policy.'
          : undefined,
      proof: {
        marketAddress: record.marketAddress,
        ammAddress: record.ammAddress,
        yesTokenAddress: record.yesTokenAddress,
        noTokenAddress: record.noTokenAddress,
        collateralAddress: record.collateralAddress,
        oracleAdapterAddress: record.oracleAdapterAddress,
        categoryId: record.categoryId,
        categoryVersion: record.categoryVersion,
        oraclePolicyId: record.oraclePolicyId,
        oraclePolicyVersion: record.oraclePolicyVersion,
        feeVersion: record.feeVersion,
        metadataSchemaVersion: record.metadataSchemaVersion,
        termsHash: record.termsHash,
        resolutionSourceHash: record.resolutionSourceHash,
        ancillaryDataHash: record.ancillaryDataHash,
        metadataURI: record.metadataURI,
        liveness: record.liveness,
        voidAfter: record.voidAfter,
        oracleState: record.oracleState,
        oracleRequestKey: record.oracleRequestKey,
        resolutionRequestedAt: record.resolutionRequestedAt,
        indexedThroughBlock: record.updatedBlock,
      },
    };
  });
}
