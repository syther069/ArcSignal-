// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

/// @title SignalAnchor
/// @notice Timestamps batches of ArcSignal AI forecasts on Arc. Each batch is a Merkle root
///         over the forecasts' SHA-256 analysis hashes, so anyone can prove a forecast existed
///         at this block. Holds no funds and has no other permissions.
contract SignalAnchor {
    address public immutable anchorer;
    mapping(bytes32 => uint64) public anchoredAt;

    event SignalBatchAnchored(bytes32 indexed root, bytes32 indexed batchId, uint32 count, uint64 timestamp);

    error Unauthorized();
    error InvalidBatch();
    error AlreadyAnchored();

    constructor(address anchorer_) {
        if (anchorer_ == address(0)) revert InvalidBatch();
        anchorer = anchorer_;
    }

    function anchor(bytes32 root, uint32 count, bytes32 batchId) external {
        if (msg.sender != anchorer) revert Unauthorized();
        if (root == bytes32(0) || count == 0) revert InvalidBatch();
        if (anchoredAt[root] != 0) revert AlreadyAnchored();
        anchoredAt[root] = uint64(block.timestamp);
        emit SignalBatchAnchored(root, batchId, count, uint64(block.timestamp));
    }
}
