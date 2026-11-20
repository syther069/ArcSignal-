// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {
    MarketCreationParams,
    MarketState,
    OracleState,
    BinaryOutcome,
    OraclePolicyVersionData
} from "../src/contracts/v2/ArcSignalTypes.sol";
import {CategoryRegistryV2} from "../src/contracts/v2/CategoryRegistryV2.sol";
import {OraclePolicyRegistryV2} from "../src/contracts/v2/OraclePolicyRegistryV2.sol";
import {ProtocolFeeControllerV2} from "../src/contracts/v2/ProtocolFeeControllerV2.sol";
import {ArcSignalFactoryV2} from "../src/contracts/v2/ArcSignalFactoryV2.sol";
import {ArcSignalMarketV2} from "../src/contracts/v2/ArcSignalMarketV2.sol";
import {ArcSignalMarketDeployerV2} from "../src/contracts/v2/ArcSignalMarketDeployerV2.sol";
import {PredictionMarketAMMDeployerV2} from "../src/contracts/v2/PredictionMarketAMMDeployerV2.sol";
import {ArcSignalSettlementOracleV2} from "../src/contracts/v2/ArcSignalSettlementOracleV2.sol";

contract SettleMockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}

/// Shared deployment: the real factory wired to ArcSignalSettlementOracleV2 as policy 1 v1.
abstract contract SettlementFixture is Test {
    int256 internal constant YES = 1e18;
    int256 internal constant NO = 0;
    int256 internal constant UNDETERMINED = 5e17;
    uint64 internal constant LIVENESS = 2 hours;
    uint128 internal constant BOND = 10e6;
    uint256 internal constant REWARD = 1e6;

    SettleMockUSDC internal usdc;
    ArcSignalSettlementOracleV2 internal oracle;
    ArcSignalFactoryV2 internal factory;
    OraclePolicyRegistryV2 internal policies;

    address internal owner = makeAddr("owner");
    address internal proposer = makeAddr("proposer");
    address internal arbiter = makeAddr("arbiter");
    address internal treasury = makeAddr("treasury");
    address internal disputer = makeAddr("disputer");
    address internal alice = makeAddr("alice");

    function _deploy() internal {
        usdc = new SettleMockUSDC();
        oracle = new ArcSignalSettlementOracleV2(owner, proposer, arbiter, address(usdc), treasury);
        CategoryRegistryV2 categories = new CategoryRegistryV2(address(this));
        policies = new OraclePolicyRegistryV2(address(this));
        ProtocolFeeControllerV2 fees = new ProtocolFeeControllerV2(address(this), makeAddr("feeTreasury"));
        fees.registerFeeVersion(50, 100);
        categories.registerVersion(1, 1, keccak256("CRYPTO"), keccak256("binary-v1"), "ipfs://category/crypto/v1");
        policies.registerVersion(
            1,
            1,
            OraclePolicyVersionData({
                adapter: address(oracle),
                oracle: address(oracle),
                bondCurrency: address(usdc),
                identifier: bytes32("ARCSIGNAL_YES_NO"),
                minLiveness: 1 hours,
                maxLiveness: 7 days,
                minBond: BOND,
                rulesHash: keccak256("settlement-rules-v1"),
                rulesURI: "ipfs://oracle/settlement/v1",
                activeForNewMarkets: true
            })
        );
        ArcSignalMarketDeployerV2 marketDeployer = new ArcSignalMarketDeployerV2(address(this));
        PredictionMarketAMMDeployerV2 ammDeployer = new PredictionMarketAMMDeployerV2(address(this));
        factory = new ArcSignalFactoryV2(
            address(this),
            address(usdc),
            address(categories),
            address(policies),
            address(fees),
            address(marketDeployer),
            address(ammDeployer),
            100_000e6,
            150_000e6,
            10_000e6
        );
        marketDeployer.bindFactory(address(factory));
        ammDeployer.bindFactory(address(factory));
        usdc.mint(address(this), 10_000e6);
        usdc.approve(address(factory), type(uint256).max);
        usdc.mint(alice, 1_000e6);
        usdc.mint(disputer, 1_000e6);
        vm.prank(disputer);
        usdc.approve(address(oracle), type(uint256).max);
    }

    function _create(string memory name) internal returns (ArcSignalMarketV2 market) {
        uint64 close = uint64(block.timestamp + 1 days);
        (address m,) = factory.createMarket(
            MarketCreationParams({
                marketId: keccak256(bytes(name)),
                metadataSchemaVersion: 1,
                categoryId: 1,
                categoryVersion: 1,
                oraclePolicyId: 1,
                oraclePolicyVersion: 1,
                closeTime: close,
                liveness: LIVENESS,
                voidAfter: close + 4 hours,
                proposerBond: BOND,
                oracleReward: uint128(REWARD),
                termsHash: keccak256(abi.encode(name, "terms")),
                resolutionSourceHash: keccak256(abi.encode(name, "source")),
                ancillaryData: abi.encode("Will BTC be at or above $60,000?", name),
                metadataURI: string.concat("ipfs://market/", name),
                thesisPredictsYes: true,
                initialLiquidity: 100e6
            })
        );
        market = ArcSignalMarketV2(m);
    }

    /// Creates a market, lets alice buy YES+NO pairs, closes it and requests resolution.
    function _closedAndRequested(string memory name) internal returns (ArcSignalMarketV2 market, bytes32 key) {
        market = _create(name);
        vm.startPrank(alice);
        usdc.approve(address(market), type(uint256).max);
        market.mintPositions(50e6, alice);
        vm.stopPrank();
        vm.warp(market.closeTime());
        key = market.requestResolution();
    }
}

contract ArcSignalSettlementOracleV2Test is SettlementFixture {
    function setUp() public {
        _deploy();
    }

    function testFactoryAcceptsOracleAsItsOwnAdapter() public {
        assertEq(oracle.oracle(), address(oracle));
        ArcSignalMarketV2 market = _create("accepted");
        assertEq(address(market.oracleAdapter()), address(oracle));
    }

    function testHappyPathYesPaysWinners() public {
        (ArcSignalMarketV2 market, bytes32 key) = _closedAndRequested("yes");
        assertEq(market.oracleRequestKey(), key);
        assertEq(usdc.balanceOf(address(oracle)), REWARD);

        vm.prank(proposer);
        oracle.proposeOutcome(key, YES);
        assertEq(uint256(market.oracleState()), uint256(OracleState.PROPOSED));

        vm.warp(block.timestamp + LIVENESS);
        market.settleResolution();
        assertEq(uint256(market.marketState()), uint256(MarketState.RESOLVED));
        assertEq(uint256(market.outcome()), uint256(BinaryOutcome.YES));
        assertEq(usdc.balanceOf(treasury), REWARD, "reward goes to treasury");

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice);
        market.redeemWinning(50e6, alice);
        assertEq(usdc.balanceOf(alice) - before, 50e6, "winning YES redeems 1:1");
    }

    function testOnlyProposerCanPropose() public {
        (, bytes32 key) = _closedAndRequested("auth");
        int256 yes = YES;
        vm.expectRevert(ArcSignalSettlementOracleV2.Unauthorized.selector);
        vm.prank(alice);
        oracle.proposeOutcome(key, yes);
        vm.expectRevert(ArcSignalSettlementOracleV2.Unauthorized.selector);
        vm.prank(arbiter);
        oracle.proposeOutcome(key, yes);
    }

    function testInvalidPriceAndUnknownRequestRevert() public {
        (, bytes32 key) = _closedAndRequested("price");
        vm.startPrank(proposer);
        vm.expectRevert(ArcSignalSettlementOracleV2.InvalidPrice.selector);
        oracle.proposeOutcome(key, 42);
        vm.expectRevert(ArcSignalSettlementOracleV2.InvalidRequest.selector);
        oracle.proposeOutcome(keccak256("nope"), YES);
        vm.stopPrank();
    }

    function testNoReproposalAfterProposeOrDispute() public {
        (, bytes32 key) = _closedAndRequested("repropose");
        vm.startPrank(proposer);
        oracle.proposeOutcome(key, YES);
        vm.expectRevert(ArcSignalSettlementOracleV2.InvalidState.selector);
        oracle.proposeOutcome(key, NO);
        vm.stopPrank();
        vm.prank(disputer);
        oracle.disputeOutcome(key);
        vm.expectRevert(ArcSignalSettlementOracleV2.InvalidState.selector);
        vm.prank(proposer);
        oracle.proposeOutcome(key, NO);
    }

    function testSettleBeforeLivenessReverts() public {
        (ArcSignalMarketV2 market, bytes32 key) = _closedAndRequested("early");
        vm.prank(proposer);
        oracle.proposeOutcome(key, NO);
        vm.warp(block.timestamp + LIVENESS - 1);
        vm.expectRevert(ArcSignalSettlementOracleV2.LivenessNotExpired.selector);
        oracle.settle(key);
        vm.expectRevert(ArcSignalSettlementOracleV2.LivenessNotExpired.selector);
        market.settleResolution();
    }

    function testDoubleSettleReverts() public {
        (, bytes32 key) = _closedAndRequested("double");
        vm.prank(proposer);
        oracle.proposeOutcome(key, NO);
        vm.warp(block.timestamp + LIVENESS);
        oracle.settle(key);
        vm.expectRevert(ArcSignalSettlementOracleV2.InvalidState.selector);
        oracle.settle(key);
    }

    function testDisputeAfterLivenessReverts() public {
        (, bytes32 key) = _closedAndRequested("late-dispute");
        vm.prank(proposer);
        oracle.proposeOutcome(key, YES);
        vm.warp(block.timestamp + LIVENESS);
        vm.expectRevert(ArcSignalSettlementOracleV2.LivenessExpired.selector);
        vm.prank(disputer);
        oracle.disputeOutcome(key);
    }

    function testDisputeFreezesUntilArbitrated() public {
        (ArcSignalMarketV2 market, bytes32 key) = _closedAndRequested("frozen");
        vm.prank(proposer);
        oracle.proposeOutcome(key, YES);
        vm.prank(disputer);
        oracle.disputeOutcome(key);
        assertEq(uint256(market.oracleState()), uint256(OracleState.DISPUTED));
        assertEq(usdc.balanceOf(address(oracle)), REWARD + BOND);
        vm.warp(block.timestamp + LIVENESS);
        vm.expectRevert(ArcSignalSettlementOracleV2.InvalidState.selector);
        oracle.settle(key);
        vm.expectRevert(ArcSignalSettlementOracleV2.Unauthorized.selector);
        vm.prank(alice);
        oracle.arbitrate(key, NO);
    }

    function testArbiterOverturnsAndRefundsDisputer() public {
        (ArcSignalMarketV2 market, bytes32 key) = _closedAndRequested("overturn");
        vm.prank(proposer);
        oracle.proposeOutcome(key, YES);
        uint256 before = usdc.balanceOf(disputer);
        vm.prank(disputer);
        oracle.disputeOutcome(key);
        vm.prank(arbiter);
        oracle.arbitrate(key, NO);
        assertEq(uint256(market.outcome()), uint256(BinaryOutcome.NO));
        assertEq(uint256(market.marketState()), uint256(MarketState.RESOLVED));
        assertEq(usdc.balanceOf(disputer), before, "bond refunded when the disputer was right");
    }

    function testArbiterUpholdsAndBondGoesToTreasury() public {
        (ArcSignalMarketV2 market, bytes32 key) = _closedAndRequested("uphold");
        vm.prank(proposer);
        oracle.proposeOutcome(key, YES);
        vm.prank(disputer);
        oracle.disputeOutcome(key);
        vm.prank(arbiter);
        oracle.arbitrate(key, YES);
        assertEq(uint256(market.outcome()), uint256(BinaryOutcome.YES));
        assertEq(usdc.balanceOf(treasury), REWARD + BOND, "reward and forfeited bond to treasury");
    }

    function testArbiterCanVoidAsUndetermined() public {
        (ArcSignalMarketV2 market, bytes32 key) = _closedAndRequested("undetermined");
        vm.prank(proposer);
        oracle.proposeOutcome(key, YES);
        vm.prank(disputer);
        oracle.disputeOutcome(key);
        vm.prank(arbiter);
        oracle.arbitrate(key, UNDETERMINED);
        assertEq(uint256(market.marketState()), uint256(MarketState.VOIDED));
        assertEq(uint256(market.outcome()), uint256(BinaryOutcome.UNDETERMINED));
    }

    function testUnarbitratedDisputeBondIsRecoverableAfterVoid() public {
        (ArcSignalMarketV2 market, bytes32 key) = _closedAndRequested("stuck");
        vm.prank(proposer);
        oracle.proposeOutcome(key, YES);
        uint256 before = usdc.balanceOf(disputer);
        vm.prank(disputer);
        oracle.disputeOutcome(key);

        vm.expectRevert(ArcSignalSettlementOracleV2.InvalidState.selector);
        oracle.closeVoided(key); // market not voided yet

        vm.warp(market.voidAfter());
        market.voidExpiredMarket();
        oracle.closeVoided(key);
        assertEq(usdc.balanceOf(disputer), before, "bond returned");
        assertEq(usdc.balanceOf(address(oracle)), 0, "nothing left stuck");
        vm.expectRevert(ArcSignalSettlementOracleV2.InvalidState.selector);
        oracle.closeVoided(key);
    }

    function testOnlyOwnerChangesRoles() public {
        vm.expectRevert(ArcSignalSettlementOracleV2.Unauthorized.selector);
        oracle.setProposer(alice);
        vm.prank(owner);
        oracle.setProposer(alice);
        assertEq(oracle.proposer(), alice);
    }

    function testFuzzSettleTiming(uint64 elapsed) public {
        elapsed = uint64(bound(elapsed, 0, 3 hours));
        (ArcSignalMarketV2 market, bytes32 key) = _closedAndRequested("fuzz");
        vm.prank(proposer);
        oracle.proposeOutcome(key, NO);
        vm.warp(block.timestamp + elapsed);
        if (elapsed < LIVENESS) {
            vm.expectRevert(ArcSignalSettlementOracleV2.LivenessNotExpired.selector);
            oracle.settle(key);
        } else {
            oracle.settle(key);
            assertEq(uint256(market.outcome()), uint256(BinaryOutcome.NO));
        }
    }
}

/// Drives random proposal / dispute / arbitration / settle / void actions on one market.
contract SettlementHandler is Test {
    ArcSignalSettlementOracleV2 internal oracle;
    ArcSignalMarketV2 internal market;
    bytes32 internal key;
    address internal proposer;
    address internal arbiter;
    address internal disputer;
    uint256 public settledCount;
    uint256 public proposedCount;

    constructor(ArcSignalSettlementOracleV2 o, ArcSignalMarketV2 m, bytes32 k, address p, address a, address d) {
        oracle = o;
        market = m;
        key = k;
        proposer = p;
        arbiter = a;
        disputer = d;
    }

    function _price(uint8 seed) internal pure returns (int256) {
        uint8 s = seed % 3;
        return s == 0 ? int256(1e18) : s == 1 ? int256(0) : int256(5e17);
    }

    function propose(uint8 seed) external {
        int256 price = _price(seed);
        vm.prank(proposer);
        try oracle.proposeOutcome(key, price) { proposedCount++; } catch {}
    }

    function dispute() external {
        vm.prank(disputer);
        try oracle.disputeOutcome(key) {} catch {}
    }

    function arbitrate(uint8 seed) external {
        int256 price = _price(seed);
        vm.prank(arbiter);
        try oracle.arbitrate(key, price) { settledCount++; } catch {}
    }

    function settle() external {
        try oracle.settle(key) { settledCount++; } catch {}
    }

    function warp(uint32 by) external {
        vm.warp(block.timestamp + bound(by, 1, 3 hours));
    }

    function voidMarket() external {
        try market.voidExpiredMarket() {} catch {}
        try oracle.closeVoided(key) {} catch {}
    }
}

contract ArcSignalSettlementOracleV2InvariantTest is SettlementFixture {
    SettlementHandler internal handler;
    ArcSignalMarketV2 internal market;
    bytes32 internal key;

    function setUp() public {
        _deploy();
        (market, key) = _closedAndRequested("invariant");
        handler = new SettlementHandler(oracle, market, key, proposer, arbiter, disputer);
        targetContract(address(handler));
    }

    /// Sanity check: the handler really can propose and settle (so the invariants are meaningful).
    function testHandlerReachesSettlement() public {
        handler.propose(1);
        assertEq(handler.proposedCount(), 1);
        handler.warp(uint32(LIVENESS));
        handler.settle();
        handler.settle();
        assertEq(handler.settledCount(), 1);
        assertEq(uint256(market.marketState()), uint256(MarketState.RESOLVED));
    }

    /// A request settles at most once, and a resolved market keeps the oracle's settled outcome.
    function invariant_settlesAtMostOnce() public view {
        assertLe(handler.settledCount(), 1);
        ArcSignalSettlementOracleV2.Request memory r = oracle.getRequest(key);
        if (market.marketState() == MarketState.RESOLVED) {
            assertEq(uint256(r.state), uint256(ArcSignalSettlementOracleV2.RequestState.SETTLED));
            int256 expected = market.outcome() == BinaryOutcome.YES ? oracle.YES_PRICE() : oracle.NO_PRICE();
            assertEq(r.settledPrice, expected);
        }
    }

    /// The oracle never holds more than the reward plus one dispute bond, and nothing after closing.
    function invariant_noFundsStuck() public view {
        uint256 held = usdc.balanceOf(address(oracle));
        assertLe(held, REWARD + BOND);
        if (oracle.getRequest(key).state == ArcSignalSettlementOracleV2.RequestState.SETTLED) assertEq(held, 0);
    }
}
