import { getSql } from '@/lib/db';
import type { Hex } from 'viem';

export type AnchorCandidate = { id: string; analysisHash: string; kind?: 'signal' | 'note' };

export type SignalAnchorRecord = {
  signalId: string;
  analysisHash: string;
  leafIndex: number;
  proof: Hex[];
  merkleRoot: Hex;
  txHash: Hex;
  blockNumber: number;
  chainId: number;
  contractAddress: string;
  anchoredAt: string;
};

/** Oldest signals that are not in any anchored batch yet. */
export async function getUnanchoredSignals(limit = 500): Promise<AnchorCandidate[]> {
  const rows = await getSql()`
    select s.id, s.analysis_hash from ai_signals s
    left join signal_anchor_leaves l on l.signal_id = s.id
    where l.signal_id is null
    order by s.generated_at asc, s.id asc
    limit ${Math.max(1, Math.min(500, Math.floor(limit)))}
  `;
  return rows.map((row) => ({ id: String(row.id), analysisHash: String(row.analysis_hash), kind: 'signal' as const }));
}

/** Price-move notes not yet anchored. Missing table (before migration 006) means none. */
export async function getUnanchoredNotes(limit = 100): Promise<AnchorCandidate[]> {
  const rows = await getSql()`
    select n.id, n.note_hash from price_move_notes n
    left join note_anchor_leaves l on l.note_id = n.id
    where l.note_id is null order by n.created_at asc limit ${Math.max(1, Math.min(500, Math.floor(limit)))}
  `.catch(() => []);
  return rows.map((row) => ({ id: String(row.id), analysisHash: String(row.note_hash), kind: 'note' as const }));
}

/** Records a batch only after its transaction succeeded on chain. All or nothing. */
export async function storeAnchorBatch(batch: {
  id: string; merkleRoot: Hex; txHash: Hex; blockNumber: bigint; chainId: number; contractAddress: string;
  leaves: { signalId: string; leafIndex: number; proof: Hex[]; kind?: 'signal' | 'note' }[];
}) {
  const sql = getSql();
  await sql.transaction([
    sql`insert into signal_anchor_batches (id, merkle_root, signal_count, tx_hash, block_number, chain_id, contract_address)
      values (${batch.id}, ${batch.merkleRoot.toLowerCase()}, ${batch.leaves.length}, ${batch.txHash}, ${batch.blockNumber.toString()},
        ${batch.chainId}, ${batch.contractAddress})`,
    ...batch.leaves.map((leaf) => leaf.kind === 'note'
      ? sql`insert into note_anchor_leaves (note_id, batch_id, leaf_index, proof)
        values (${leaf.signalId}, ${batch.id}, ${leaf.leafIndex}, ${JSON.stringify(leaf.proof)}::jsonb)`
      : sql`insert into signal_anchor_leaves (signal_id, batch_id, leaf_index, proof)
        values (${leaf.signalId}, ${batch.id}, ${leaf.leafIndex}, ${JSON.stringify(leaf.proof)}::jsonb)`),
  ]);
}

/** Anchor records for every anchored signal of one market. */
export async function getMarketAnchors(marketId: string): Promise<SignalAnchorRecord[]> {
  const rows = await getSql()`
    select l.signal_id, s.analysis_hash, l.leaf_index, l.proof, b.merkle_root, b.tx_hash, b.block_number,
      b.chain_id, b.contract_address, b.anchored_at
    from signal_anchor_leaves l
    join signal_anchor_batches b on b.id = l.batch_id
    join ai_signals s on s.id = l.signal_id
    where s.market_id = ${marketId}
  `;
  return rows.map((row) => ({
    signalId: String(row.signal_id), analysisHash: String(row.analysis_hash), leafIndex: Number(row.leaf_index),
    proof: row.proof as Hex[], merkleRoot: row.merkle_root as Hex, txHash: row.tx_hash as Hex,
    blockNumber: Number(row.block_number), chainId: Number(row.chain_id), contractAddress: String(row.contract_address),
    anchoredAt: new Date(row.anchored_at).toISOString(),
  }));
}
