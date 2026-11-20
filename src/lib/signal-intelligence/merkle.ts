/**
 * Merkle batches for anchoring AI signal hashes on Arc.
 *
 * Each signal already has `analysisHash`: SHA-256 (hex) of its canonical JSON (see audit.ts).
 * We keep that as the commitment and wrap it once with keccak256 so leaves and nodes use the
 * EVM's native hash: leaf = keccak256(0x || analysisHash). Pairs are sorted before hashing
 * (OpenZeppelin MerkleProof style), so a proof is just the list of sibling hashes.
 *
 * Pure functions: safe to use on the server (cron) and in the browser (proof check).
 */
import { concat, keccak256, type Hex } from 'viem';

export function leafFor(analysisHash: string): Hex {
  if (!/^[0-9a-f]{64}$/i.test(analysisHash)) throw new Error('analysisHash must be 64 hex characters');
  return keccak256(`0x${analysisHash.toLowerCase()}`);
}

function hashPair(a: Hex, b: Hex): Hex {
  return a.toLowerCase() < b.toLowerCase() ? keccak256(concat([a, b])) : keccak256(concat([b, a]));
}

/** Levels from leaves (index 0) to root. An odd last node is carried up unchanged. */
export function buildTree(leaves: Hex[]): Hex[][] {
  if (leaves.length === 0) throw new Error('Cannot build a tree with no leaves');
  const levels: Hex[][] = [leaves];
  while (levels.at(-1)!.length > 1) {
    const level = levels.at(-1)!;
    const next: Hex[] = [];
    for (let i = 0; i < level.length; i += 2) next.push(i + 1 < level.length ? hashPair(level[i], level[i + 1]) : level[i]);
    levels.push(next);
  }
  return levels;
}

export function rootOf(levels: Hex[][]): Hex {
  return levels.at(-1)![0];
}

export function proofFor(levels: Hex[][], index: number): Hex[] {
  if (index < 0 || index >= levels[0].length) throw new Error('Leaf index out of range');
  const proof: Hex[] = [];
  let i = index;
  for (let level = 0; level < levels.length - 1; level++) {
    const sibling = i % 2 === 0 ? i + 1 : i - 1;
    if (sibling < levels[level].length) proof.push(levels[level][sibling]);
    i = Math.floor(i / 2);
  }
  return proof;
}

export function verifyProof(leaf: Hex, proof: Hex[], root: Hex): boolean {
  let node = leaf;
  for (const sibling of proof) node = hashPair(node, sibling);
  return node.toLowerCase() === root.toLowerCase();
}
