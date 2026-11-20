import { parseAbi } from 'viem';

export const SIGNAL_ANCHOR_ABI = parseAbi([
  'function anchorer() view returns (address)',
  'function anchoredAt(bytes32 root) view returns (uint64)',
  'function anchor(bytes32 root,uint32 count,bytes32 batchId)',
  'event SignalBatchAnchored(bytes32 indexed root,bytes32 indexed batchId,uint32 count,uint64 timestamp)',
  'error Unauthorized()',
  'error InvalidBatch()',
  'error AlreadyAnchored()',
]);
