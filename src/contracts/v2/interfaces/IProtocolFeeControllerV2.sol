// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

interface IProtocolFeeControllerV2 {
    function treasury() external view returns (address);
    function depositFee(address token, uint256 amount) external;
}
