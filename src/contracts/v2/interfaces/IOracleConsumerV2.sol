// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

interface IOracleConsumerV2 {
    function onOracleProposed(bytes32 requestKey) external;
    function onOracleDisputed(bytes32 requestKey) external;
    function onOracleSettled(bytes32 requestKey, int256 settledPrice) external;
}
