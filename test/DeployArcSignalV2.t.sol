// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {MarketCreationParams, MarketState, BinaryOutcome} from "../src/contracts/v2/ArcSignalTypes.sol";
import {ArcSignalFactoryV2} from "../src/contracts/v2/ArcSignalFactoryV2.sol";
import {ArcSignalMarketV2} from "../src/contracts/v2/ArcSignalMarketV2.sol";
import {OraclePolicyRegistryV2} from "../src/contracts/v2/OraclePolicyRegistryV2.sol";
import {ArcSignalSettlementOracleV2} from "../src/contracts/v2/ArcSignalSettlementOracleV2.sol";
import {DeployArcSignalV2} from "../script/DeployArcSignalV2.s.sol";

contract DeployMockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address a, uint256 amount) external {
        _mint(a, amount);
    }
}

contract DeployArcSignalV2Test is Test {
    uint256 internal constant DEPLOYER_KEY = 0xD3B104;
    DeployArcSignalV2 internal script;
    DeployMockUSDC internal usdc;
    address internal admin = makeAddr("newAdmin");
    address internal operator = makeAddr("newOperator");
    address internal treasury = makeAddr("newTreasury");

    function setUp() public {
        script = new DeployArcSignalV2();
        usdc = new DeployMockUSDC();
    }

    function _config(address proposer, address arbiter, bool single) internal view returns (DeployArcSignalV2.DeploymentConfig memory c) {
        c.deployerKey = DEPLOYER_KEY;
        c.deployer = vm.addr(DEPLOYER_KEY);
        c.protocolAdmin = admin;
        c.marketCreator = operator;
        c.resolutionOperator = operator;
        c.pauseGuardian = admin;
        c.treasury = treasury;
        c.usdc = address(usdc);
        c.settlementOracle = true;
        c.settlementProposer = proposer;
        c.settlementArbiter = arbiter;
        c.allowSingleOperator = single;
        c.maxMarketCollateral = 10_000e6;
        c.maxProtocolCollateral = 100_000e6;
        c.maxInitialLiquidity = 1_000e6;
        c.categoryBaseURI = "https://arc-signal.xyz/categories";
        c.protocolFeeBps = 50;
        c.lpFeeBps = 100;
        c.oracleIdentifier = bytes32("ARCSIGNAL_YES_NO");
        c.minLiveness = 1 hours;
        c.maxLiveness = 7 days;
        c.minBond = 25e6;
        c.rulesHash = keccak256("rules");
        c.rulesURI = "ipfs://arcsignal/oracle/settlement-v1";
    }

    function testFreshDeployHandsOffRolesAndSettlesAMarket() public {
        DeployArcSignalV2.Deployed memory d = script.deploy(_config(operator, admin, false));
        ArcSignalFactoryV2 factory = ArcSignalFactoryV2(d.factory);
        ArcSignalSettlementOracleV2 oracle = ArcSignalSettlementOracleV2(d.oracle);
        address deployer = vm.addr(DEPLOYER_KEY);

        // Roles: the new admin owns everything; the deployer keeps nothing.
        assertTrue(factory.hasRole(factory.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(factory.hasRole(factory.MARKET_CREATOR_ROLE(), operator));
        assertFalse(factory.hasRole(factory.DEFAULT_ADMIN_ROLE(), deployer));
        assertFalse(OraclePolicyRegistryV2(d.policies).hasRole(OraclePolicyRegistryV2(d.policies).ORACLE_POLICY_ADMIN_ROLE(), deployer));
        assertEq(d.adapter, d.oracle);
        assertEq(oracle.proposer(), operator);
        assertEq(oracle.arbiter(), admin);
        assertEq(oracle.owner(), admin);

        // A full market lifecycle through the freshly deployed stack.
        usdc.mint(operator, 1_000e6);
        uint64 close = uint64(block.timestamp + 1 hours);
        vm.startPrank(operator);
        usdc.approve(d.factory, type(uint256).max);
        (address m,) = factory.createMarket(MarketCreationParams({
            marketId: keccak256("btc-60k"), metadataSchemaVersion: 1, categoryId: 1, categoryVersion: 1,
            oraclePolicyId: 1, oraclePolicyVersion: 1, closeTime: close, liveness: 1 hours, voidAfter: close + 3 hours,
            proposerBond: 25e6, oracleReward: 0, termsHash: keccak256("terms"), resolutionSourceHash: keccak256("src"),
            ancillaryData: abi.encode("Will BTC be at or above $60,000?"), metadataURI: "ipfs://m", thesisPredictsYes: true,
            initialLiquidity: 100e6
        }));
        vm.stopPrank();
        ArcSignalMarketV2 market = ArcSignalMarketV2(m);

        vm.warp(close);
        bytes32 key = market.requestResolution();
        vm.prank(operator);
        oracle.proposeOutcome(key, 1e18);
        vm.warp(block.timestamp + 1 hours);
        market.settleResolution();
        assertEq(uint256(market.marketState()), uint256(MarketState.RESOLVED));
        assertEq(uint256(market.outcome()), uint256(BinaryOutcome.YES));
    }

    function testRefusesCompromisedWallets() public {
        DeployArcSignalV2.DeploymentConfig memory c = _config(operator, admin, false);
        c.protocolAdmin = 0x93c55fDC841835fB61b944C6970f334AD4A2A5d6;
        vm.expectRevert(bytes("protocol admin wallet is compromised"));
        script.deploy(c);

        c = _config(operator, admin, false);
        c.settlementArbiter = 0xA53Ad24909d9E5f4eE015b90EAA0fbA5C0B9A9a5;
        vm.expectRevert(bytes("settlement arbiter wallet is compromised"));
        script.deploy(c);
    }

    function testSeparationUnlessSingleOperatorIsExplicit() public {
        vm.expectRevert(bytes("proposer and arbiter must differ"));
        script.deploy(_config(operator, operator, false));
        DeployArcSignalV2.Deployed memory d = script.deploy(_config(operator, operator, true));
        assertEq(ArcSignalSettlementOracleV2(d.oracle).arbiter(), operator);
    }

    function testMainnetRefusesCodelessExternalOracle() public {
        vm.chainId(5042);
        DeployArcSignalV2.DeploymentConfig memory c = _config(operator, admin, false);
        c.settlementOracle = false;
        c.oracle = makeAddr("plainWalletOracle");
        vm.expectRevert(bytes("mainnet oracle must be a contract"));
        script.deploy(c);
    }
}
