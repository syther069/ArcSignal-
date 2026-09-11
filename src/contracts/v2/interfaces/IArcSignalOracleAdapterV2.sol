// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

interface IArcSignalOracleAdapterV2 {
    function requestResolution(
        bytes32 marketId,
        bytes32 identifier,
        address currency,
        uint256 reward,
        uint128 bond,
        uint64 liveness,
        bytes calldata ancillaryData
    ) external returns (bytes32 requestKey);

    function settle(bytes32 requestKey) external returns (int256 price);
}
