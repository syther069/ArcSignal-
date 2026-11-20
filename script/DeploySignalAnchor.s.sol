// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Script, console2} from "forge-std/Script.sol";
import {SignalAnchor} from "../src/contracts/v2/SignalAnchor.sol";

/// Deploys SignalAnchor. SIGNAL_ANCHORER must be a dedicated key, not the protocol admin.
/// forge script script/DeploySignalAnchor.s.sol --rpc-url $ARC_RPC_URL --broadcast
contract DeploySignalAnchor is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address anchorer = vm.envAddress("SIGNAL_ANCHORER");
        vm.startBroadcast(deployerKey);
        SignalAnchor anchorContract = new SignalAnchor(anchorer);
        vm.stopBroadcast();
        console2.log("SignalAnchor", address(anchorContract));
        console2.log("anchorer", anchorer);
    }
}
