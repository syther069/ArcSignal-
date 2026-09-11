// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

interface IOptimisticOracleV2 {
    function requestPrice(bytes32, uint256, bytes calldata, address, uint256) external returns (uint256);
    function setCustomLiveness(bytes32, uint256, bytes calldata, uint256) external;
    function setBond(bytes32, uint256, bytes calldata, uint256) external returns (uint256);
    function setEventBased(bytes32, uint256, bytes calldata) external;
    function settleAndGetPrice(bytes32, uint256, bytes calldata) external returns (int256);
}
