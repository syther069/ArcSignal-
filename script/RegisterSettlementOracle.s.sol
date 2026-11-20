// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Script, console2} from "forge-std/Script.sol";
import {OraclePolicyVersionData} from "../src/contracts/v2/ArcSignalTypes.sol";
import {OraclePolicyRegistryV2} from "../src/contracts/v2/OraclePolicyRegistryV2.sol";
import {ArcSignalSettlementOracleV2} from "../src/contracts/v2/ArcSignalSettlementOracleV2.sol";

/// Deploys ArcSignalSettlementOracleV2 and makes it the oracle for NEW V2 markets by registering
/// the next version of oracle policy 1 (the factory reads the adapter from the policy, so no
/// factory redeploy is needed). The previous version is deactivated for new markets.
///
/// Run on testnet first:
///   forge script script/RegisterSettlementOracle.s.sol --rpc-url $ARC_RPC_URL --broadcast
///
/// Env (all required unless noted):
///   DEPLOYER_PRIVATE_KEY      key holding ORACLE_POLICY_ADMIN_ROLE on the registry
///   ORACLE_POLICY_REGISTRY    OraclePolicyRegistryV2 address (factory.oraclePolicyRegistry())
///   USDC_ADDRESS              bond currency (must equal the factory's collateral)
///   SETTLEMENT_OWNER          multisig that can change roles
///   SETTLEMENT_PROPOSER       resolver key that proposes results (not the admin)
///   SETTLEMENT_ARBITER        multisig that arbitrates disputes
///   SETTLEMENT_TREASURY       receives rewards and forfeited dispute bonds
///   SETTLEMENT_MIN_BOND       optional, default 1 USDC (1e6). Must be <= the bond markets are created with.
///   SETTLEMENT_RULES_URI      optional, default "ipfs://arcsignal/oracle/settlement-v1"
///   ALLOW_EOA_ARBITER         optional, "true" only for testnet: allows a plain wallet as arbiter/owner
contract RegisterSettlementOracle is Script {
    uint32 internal constant POLICY_ID = 1;

    struct Config {
        uint256 deployerKey;
        OraclePolicyRegistryV2 registry;
        address usdc;
        address owner;
        address proposer;
        address arbiter;
        address treasury;
        uint128 minBond;
        string rulesURI;
        bool allowEoaArbiter;
    }

    function run() external {
        register(Config({
            deployerKey: vm.envUint("DEPLOYER_PRIVATE_KEY"),
            registry: OraclePolicyRegistryV2(vm.envAddress("ORACLE_POLICY_REGISTRY")),
            usdc: vm.envAddress("USDC_ADDRESS"),
            owner: vm.envAddress("SETTLEMENT_OWNER"),
            proposer: vm.envAddress("SETTLEMENT_PROPOSER"),
            arbiter: vm.envAddress("SETTLEMENT_ARBITER"),
            treasury: vm.envAddress("SETTLEMENT_TREASURY"),
            minBond: uint128(vm.envOr("SETTLEMENT_MIN_BOND", uint256(1e6))),
            rulesURI: vm.envOr("SETTLEMENT_RULES_URI", string("ipfs://arcsignal/oracle/settlement-v1")),
            allowEoaArbiter: vm.envOr("ALLOW_EOA_ARBITER", false)
        }));
    }

    function register(Config memory c) public returns (ArcSignalSettlementOracleV2 oracle, uint32 next) {
        // Separation of duties: the proposer must not also arbitrate its own proposals.
        require(c.proposer != c.arbiter, "proposer and arbiter must differ");
        if (!c.allowEoaArbiter) {
            require(c.arbiter.code.length > 0, "arbiter must be a multisig contract (set ALLOW_EOA_ARBITER=true on testnet)");
            require(c.owner.code.length > 0, "owner must be a multisig contract (set ALLOW_EOA_ARBITER=true on testnet)");
        }

        uint32 previous = c.registry.latestVersion(POLICY_ID);
        next = previous + 1;

        vm.startBroadcast(c.deployerKey);
        oracle = new ArcSignalSettlementOracleV2(c.owner, c.proposer, c.arbiter, c.usdc, c.treasury);
        c.registry.registerVersion(
            POLICY_ID,
            next,
            OraclePolicyVersionData({
                adapter: address(oracle),
                oracle: address(oracle),
                bondCurrency: c.usdc,
                identifier: bytes32("ARCSIGNAL_YES_NO"),
                minLiveness: 1 hours,
                maxLiveness: 7 days,
                minBond: c.minBond,
                rulesHash: keccak256(bytes(c.rulesURI)),
                rulesURI: c.rulesURI,
                activeForNewMarkets: true
            })
        );
        if (previous > 0) c.registry.setVersionActive(POLICY_ID, previous, false);
        vm.stopBroadcast();

        console2.log("ArcSignalSettlementOracleV2", address(oracle));
        console2.log("New policy version (set ARCSIGNAL_V2_ORACLE_POLICY_VERSION to this)", next);
        console2.log("Deactivated previous version", previous);
    }
}
