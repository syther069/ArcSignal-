// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Test} from "forge-std/Test.sol";
import {OraclePolicyVersionData} from "../src/contracts/v2/ArcSignalTypes.sol";
import {OraclePolicyRegistryV2} from "../src/contracts/v2/OraclePolicyRegistryV2.sol";
import {RegisterSettlementOracle} from "../script/RegisterSettlementOracle.s.sol";

contract CodeHolder {}

/// Runs the real registration logic against a local registry.
contract RegisterSettlementOracleTest is Test {
    uint256 internal constant KEY = 0xA11CE;
    OraclePolicyRegistryV2 internal registry;
    RegisterSettlementOracle internal script;
    address internal usdc;

    function setUp() public {
        registry = new OraclePolicyRegistryV2(vm.addr(KEY));
        usdc = address(new CodeHolder());
        script = new RegisterSettlementOracle();
        vm.prank(vm.addr(KEY));
        registry.registerVersion(1, 1, OraclePolicyVersionData({
            adapter: address(1), oracle: address(2), bondCurrency: usdc, identifier: bytes32("OLD"),
            minLiveness: 1 hours, maxLiveness: 7 days, minBond: 1e6, rulesHash: keccak256("old"), rulesURI: "ipfs://old",
            activeForNewMarkets: true
        }));
    }

    function _config(address arbiter, bool allowEoa) internal returns (RegisterSettlementOracle.Config memory) {
        return RegisterSettlementOracle.Config({
            deployerKey: KEY, registry: registry, usdc: usdc, owner: address(new CodeHolder()),
            proposer: makeAddr("proposer"), arbiter: arbiter, treasury: makeAddr("treasury"),
            minBond: 1e6, rulesURI: "ipfs://arcsignal/oracle/settlement-v1", allowEoaArbiter: allowEoa, allowSingleOperator: false
        });
    }

    function testRegistersNextVersionAndDeactivatesPrevious() public {
        (, uint32 next) = script.register(_config(address(new CodeHolder()), false));
        assertEq(next, 2);
        assertEq(registry.latestVersion(1), 2);
        assertTrue(registry.isActive(1, 2));
        assertFalse(registry.isActive(1, 1));
        OraclePolicyVersionData memory v2 = registry.getVersion(1, 2);
        assertEq(v2.adapter, v2.oracle, "oracle acts as its own adapter");
        assertGt(v2.adapter.code.length, 0);
        assertEq(v2.minBond, 1e6);
    }

    function testRefusesPlainWalletArbiterByDefault() public {
        RegisterSettlementOracle.Config memory c = _config(makeAddr("plainWallet"), false);
        vm.expectRevert(bytes("arbiter must be a multisig contract (set ALLOW_EOA_ARBITER=true on testnet)"));
        script.register(c);
    }

    function testRefusesProposerAsArbiter() public {
        RegisterSettlementOracle.Config memory c = _config(makeAddr("proposer"), true);
        vm.expectRevert(bytes("proposer and arbiter must differ"));
        script.register(c);
    }

    function testAllowsPlainWalletArbiterOnlyWhenExplicit() public {
        (, uint32 next) = script.register(_config(makeAddr("testnetArbiter"), true));
        assertEq(next, 2);
    }

    function testSingleOperatorOnlyWithExplicitFlag() public {
        address one = makeAddr("operator");
        RegisterSettlementOracle.Config memory c = _config(one, false);
        c.proposer = one;
        c.owner = one;
        vm.expectRevert(bytes("proposer and arbiter must differ"));
        script.register(c);
        c.allowSingleOperator = true;
        (, uint32 next) = script.register(c);
        assertEq(next, 2);
    }
}
