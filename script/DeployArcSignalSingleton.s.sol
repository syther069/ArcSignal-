// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {ARCSignal} from "../src/contracts/ArcSignal.sol";

contract DeployArcSignalSingleton is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address usdcAddress = vm.envAddress("USDC_ADDRESS");
        uint256 expectedChainId = vm.envUint("EXPECTED_CHAIN_ID");

        require(block.chainid == expectedChainId, "Chain ID mismatch");
        require(usdcAddress != address(0), "USDC address required");

        vm.startBroadcast(deployerKey);
        ARCSignal signal = new ARCSignal(usdcAddress);
        vm.stopBroadcast();

        console2.log("ArcSignal Singleton deployed at:", address(signal));
        console2.log("USDC collateral:", usdcAddress);
        console2.log("Owner:", signal.owner());
    }
}
