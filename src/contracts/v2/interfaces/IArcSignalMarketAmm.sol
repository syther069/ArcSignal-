// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

interface IArcSignalMarketAmm {
    function mintPositionsFor(address payer, address recipient, uint256 amount) external;
    function marketStateIsOpen() external view returns (bool);
    function exposurePaused() external view returns (bool);
    function collateral() external view returns (address);
    function yesToken() external view returns (address);
    function noToken() external view returns (address);
    function closeTime() external view returns (uint64);
}
