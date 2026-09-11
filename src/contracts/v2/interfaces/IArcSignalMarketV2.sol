// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {MarketState, OracleState, BinaryOutcome} from "../ArcSignalTypes.sol";

interface IArcSignalMarketV2 {
    function marketId() external view returns (bytes32);
    function marketState() external view returns (MarketState);
    function oracleState() external view returns (OracleState);
    function outcome() external view returns (BinaryOutcome);
    function closeTime() external view returns (uint64);
    function requestResolution() external returns (bytes32);
    function settleResolution() external;
    function syncState() external returns (MarketState);
    function voidExpiredMarket() external;
}
