// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MarketCreationParams} from "./ArcSignalTypes.sol";
import {ArcSignalMarketV2} from "./ArcSignalMarketV2.sol";

contract ArcSignalMarketDeployerV2 is Ownable {
    address public factory;

    error InvalidFactory();
    error Unauthorized();

    event FactoryBound(address indexed factory);

    constructor(address owner_) Ownable(owner_) {}

    function bindFactory(address factory_) external onlyOwner {
        if (factory != address(0) || factory_ == address(0) || factory_.code.length == 0) revert InvalidFactory();
        factory = factory_;
        emit FactoryBound(factory_);
        renounceOwnership();
    }

    function deploy(
        MarketCreationParams calldata params,
        address collateral,
        address oracleAdapter,
        bytes32 oracleIdentifier,
        uint32 feeVersion,
        bytes32 salt
    ) external returns (address) {
        if (msg.sender != factory) revert Unauthorized();
        return address(
            new ArcSignalMarketV2{salt: salt}(params, collateral, oracleAdapter, oracleIdentifier, feeVersion, factory)
        );
    }
}
