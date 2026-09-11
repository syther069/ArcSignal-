// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {PredictionMarketAMMV2} from "./PredictionMarketAMMV2.sol";

contract PredictionMarketAMMDeployerV2 is Ownable {
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

    function deploy(address market, address feeController, uint16 protocolFeeBps, uint16 lpFeeBps)
        external
        returns (address)
    {
        if (msg.sender != factory) revert Unauthorized();
        return address(new PredictionMarketAMMV2(market, feeController, protocolFeeBps, lpFeeBps, factory));
    }
}
