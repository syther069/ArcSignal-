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
import {UMAOracleAdapterV2} from "../src/contracts/v2/UMAOracleAdapterV2.sol";
import {ArcSignalFactoryV2} from "../src/contracts/v2/ArcSignalFactoryV2.sol";
import {ArcSignalMarketV2} from "../src/contracts/v2/ArcSignalMarketV2.sol";
import {PredictionMarketAMMV2} from "../src/contracts/v2/PredictionMarketAMMV2.sol";
import {ArcSignalMarketDeployerV2} from "../src/contracts/v2/ArcSignalMarketDeployerV2.sol";
import {PredictionMarketAMMDeployerV2} from "../src/contracts/v2/PredictionMarketAMMDeployerV2.sol";
import {OutcomeTokenV2} from "../src/contracts/v2/OutcomeTokenV2.sol";

contract MockUSDCV2 is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}

contract MockOptimisticOracleV2 {
    int256 public settlementPrice = 1e18;

    function requestPrice(bytes32, uint256, bytes calldata, address currency, uint256 reward)
        external
        returns (uint256)
    {
        if (reward > 0) ERC20(currency).transferFrom(msg.sender, address(this), reward);
        return 0;
    }

    function setCustomLiveness(bytes32, uint256, bytes calldata, uint256) external {}

    function setBond(bytes32, uint256, bytes calldata, uint256 bond) external pure returns (uint256) {
        return bond;
    }
    function setEventBased(bytes32, uint256, bytes calldata) external {}

    function settleAndGetPrice(bytes32, uint256, bytes calldata) external view returns (int256) {
        return settlementPrice;
    }

    function setSettlementPrice(int256 price) external {
        settlementPrice = price;
    }

    function propose(UMAOracleAdapterV2 adapter, bytes32 identifier, uint256 timestamp, bytes calldata data) external {
        adapter.priceProposed(identifier, timestamp, data);
    }

    function dispute(UMAOracleAdapterV2 adapter, bytes32 identifier, uint256 timestamp, bytes calldata data) external {
        adapter.priceDisputed(identifier, timestamp, data, 0);
    }
}

contract ArcSignalV2Test is Test {
    MockUSDCV2 private usdc;
    MockOptimisticOracleV2 private oracle;
    UMAOracleAdapterV2 private adapter;
    CategoryRegistryV2 private categories;
    OraclePolicyRegistryV2 private policies;
    ProtocolFeeControllerV2 private fees;
    ArcSignalFactoryV2 private factory;
    ArcSignalMarketDeployerV2 private marketDeployer;
    PredictionMarketAMMDeployerV2 private ammDeployer;
    address private alice = makeAddr("alice");
    address private unauthorized = makeAddr("unauthorized");

    function setUp() public {
        usdc = new MockUSDCV2();
        oracle = new MockOptimisticOracleV2();
        adapter = new UMAOracleAdapterV2(address(oracle));
        categories = new CategoryRegistryV2(address(this));
        policies = new OraclePolicyRegistryV2(address(this));
        fees = new ProtocolFeeControllerV2(address(this), makeAddr("treasury"));
        fees.registerFeeVersion(50, 100);
        categories.registerVersion(1, 1, keccak256("CRYPTO"), keccak256("binary-v1"), "ipfs://category/crypto/v1");
        policies.registerVersion(
            1,
            1,
            OraclePolicyVersionData({
                adapter: address(adapter),
                oracle: address(oracle),
                bondCurrency: address(usdc),
                identifier: bytes32("YES_OR_NO_QUERY"),
                minLiveness: 1 hours,
                maxLiveness: 7 days,
                minBond: 10e6,
                rulesHash: keccak256("rules-v1"),
                rulesURI: "ipfs://oracle/rules/v1",
                activeForNewMarkets: true
            })
        );
        marketDeployer = new ArcSignalMarketDeployerV2(address(this));
        ammDeployer = new PredictionMarketAMMDeployerV2(address(this));
        factory = new ArcSignalFactoryV2(
            address(this),
            address(usdc),
            address(categories),
            address(policies),
            address(fees),
            address(marketDeployer),
            address(ammDeployer)
        );
        marketDeployer.bindFactory(address(factory));
        ammDeployer.bindFactory(address(factory));
        usdc.mint(address(this), 10_000e6);
        usdc.mint(alice, 1_000e6);
        usdc.approve(address(factory), type(uint256).max);
    }

    function testCreatesVersionPinnedMarketAndInitialLiquidity() public {
        (ArcSignalMarketV2 market, PredictionMarketAMMV2 amm) = _create("market-one", 100e6);

        assertEq(factory.marketById(keccak256("market-one")), address(market));
        assertEq(factory.marketCount(), 1);
        assertEq(market.categoryId(), 1);
        assertEq(market.PROTOCOL_VERSION(), 2);
        assertEq(market.metadataSchemaVersion(), 1);
        assertEq(market.categoryVersion(), 1);
        assertEq(market.oraclePolicyVersion(), 1);
        assertEq(market.feeVersion(), 1);
        assertEq(address(market.amm()), address(amm));
        assertEq(amm.balanceOf(address(this)), 100e6 - amm.MINIMUM_LIQUIDITY());
        assertEq(market.collateralLiability(), 100e6);
    }

    function testOnlyCreatorRoleCanCreateAndDuplicateIdsFail() public {
        MarketCreationParams memory params = _params("role-market", 0);
        vm.expectRevert();
        vm.prank(unauthorized);
        factory.createMarket(params);

        factory.createMarket(params);
        vm.expectRevert(ArcSignalFactoryV2.DuplicateMarket.selector);
        factory.createMarket(params);
    }

    function testInactiveCategoryCannotBackNewMarketButExistingMarketKeepsVersion() public {
        (ArcSignalMarketV2 market,) = _create("existing", 0);
        categories.setVersionActive(1, 1, false);
        assertEq(market.categoryVersion(), 1);

        vm.expectRevert(ArcSignalFactoryV2.InvalidConfiguration.selector);
        factory.createMarket(_params("blocked", 0));
    }

    function testMintTransferSwapFeeCollectionAndPairRedemption() public {
        (ArcSignalMarketV2 market, PredictionMarketAMMV2 amm) = _create("trading", 200e6);
        vm.startPrank(alice);
        usdc.approve(address(market), type(uint256).max);
        market.mintPositions(100e6, alice);
        OutcomeTokenV2(address(market.yesToken())).transfer(unauthorized, 5e6);
        OutcomeTokenV2(address(market.yesToken())).approve(address(amm), type(uint256).max);
        uint256 quoted = amm.quoteExactInput(true, 10e6);
        uint256 noBefore = market.noToken().balanceOf(alice);
        amm.swapExactYesForNo(10e6, quoted, alice);
        assertEq(market.noToken().balanceOf(alice) - noBefore, quoted);
        vm.stopPrank();

        assertGt(amm.protocolFeesYes(), 0);
        amm.collectProtocolFees();
        assertGt(fees.accruedFees(address(market.yesToken())), 0);

        vm.startPrank(alice);
        market.redeemPairs(20e6, alice);
        vm.stopPrank();
        assertEq(market.collateralLiability(), 280e6);
    }

    function testPauseStopsNewExposureButAllowsPairRedemption() public {
        (ArcSignalMarketV2 market,) = _create("paused", 0);
        vm.startPrank(alice);
        usdc.approve(address(market), type(uint256).max);
        market.mintPositions(30e6, alice);
        vm.stopPrank();

        factory.setGlobalExposurePaused(true);
        vm.expectRevert(ArcSignalFactoryV2.ExposurePaused.selector);
        factory.createMarket(_params("creation-paused", 0));
        vm.expectRevert(ArcSignalMarketV2.ExposurePaused.selector);
        vm.prank(alice);
        market.mintPositions(1e6, alice);

        vm.prank(alice);
        market.redeemPairs(30e6, alice);
        assertEq(usdc.balanceOf(alice), 1_000e6);
    }

    function testOptimisticProposalDisputeSettlementAndWinnerRedemption() public {
        (ArcSignalMarketV2 market,) = _create("oracle-yes", 0);
        vm.startPrank(alice);
        usdc.approve(address(market), type(uint256).max);
        market.mintPositions(50e6, alice);
        vm.stopPrank();
        vm.warp(market.closeTime());
        bytes32 key = market.requestResolution();
        UMAOracleAdapterV2.RequestRecord memory request = adapter.getRequest(key);

        oracle.propose(adapter, request.identifier, request.timestamp, request.ancillaryData);
        assertEq(uint256(market.oracleState()), uint256(OracleState.PROPOSED));
        oracle.dispute(adapter, request.identifier, request.timestamp, request.ancillaryData);
        assertEq(uint256(market.oracleState()), uint256(OracleState.DISPUTED));
        market.settleResolution();

        assertEq(uint256(market.marketState()), uint256(MarketState.RESOLVED));
        assertEq(uint256(market.outcome()), uint256(BinaryOutcome.YES));
        vm.prank(alice);
        market.redeemWinning(50e6, alice);
        assertEq(usdc.balanceOf(alice), 1_000e6);
    }

    function testVoidTimeoutAndEqualValueRedemption() public {
        (ArcSignalMarketV2 market,) = _create("voided", 0);
        vm.startPrank(alice);
        usdc.approve(address(market), type(uint256).max);
        market.mintPositions(40e6, alice);
        vm.stopPrank();
        vm.warp(market.voidAfter());
        market.voidExpiredMarket();

        assertEq(uint256(market.marketState()), uint256(MarketState.VOIDED));
        vm.prank(alice);
        market.redeemVoided(40e6, 40e6, alice);
        assertEq(usdc.balanceOf(alice), 1_000e6);
    }

    function testUndeterminedOraclePriceVoidsMarket() public {
        (ArcSignalMarketV2 market,) = _create("oracle-void", 0);
        vm.warp(market.closeTime());
        market.requestResolution();
        oracle.setSettlementPrice(5e17);
        market.settleResolution();
        assertEq(uint256(market.marketState()), uint256(MarketState.VOIDED));
        assertEq(uint256(market.outcome()), uint256(BinaryOutcome.UNDETERMINED));
    }

    function testResolutionRequestCannotStartWithoutFullDisputeWindow() public {
        (ArcSignalMarketV2 market,) = _create("late-request", 0);
        vm.warp(market.voidAfter() - market.liveness() + 1);
        vm.expectRevert(ArcSignalMarketV2.InvalidState.selector);
        market.requestResolution();
    }

    function testBatchCreationAndMaintenanceAreBounded() public {
        MarketCreationParams[] memory params = new MarketCreationParams[](2);
        params[0] = _params("batch-a", 0);
        params[1] = _params("batch-b", 0);
        (address[] memory markets,) = factory.createMarkets(params);
        vm.warp(ArcSignalMarketV2(markets[0]).closeTime());
        factory.batchSyncState(markets);
        assertEq(uint256(ArcSignalMarketV2(markets[0]).marketState()), uint256(MarketState.CLOSED));
        factory.batchRequestResolution(markets);
        assertEq(uint256(ArcSignalMarketV2(markets[1]).oracleState()), uint256(OracleState.REQUESTED));
        factory.batchSettleResolution(markets);
        assertEq(uint256(ArcSignalMarketV2(markets[0]).marketState()), uint256(MarketState.RESOLVED));
    }

    function testFuzzPairMintAndRedeemPreserveCollateralSolvency(uint96 rawAmount) public {
        uint256 amount = bound(uint256(rawAmount), 1, 500e6);
        (ArcSignalMarketV2 market,) = _create("fuzz-solvency", 0);
        vm.startPrank(alice);
        usdc.approve(address(market), type(uint256).max);
        market.mintPositions(amount, alice);
        assertEq(usdc.balanceOf(address(market)), market.collateralLiability() + market.oracleReward());
        market.redeemPairs(amount, alice);
        vm.stopPrank();
        assertEq(market.collateralLiability(), 0);
        assertEq(usdc.balanceOf(address(market)), market.oracleReward());
    }

    function testFuzzSwapDoesNotDecreaseAvailableReserveProduct(uint64 rawAmount) public {
        (ArcSignalMarketV2 market, PredictionMarketAMMV2 amm) = _create("fuzz-swap", 500e6);
        uint256 amount = bound(uint256(rawAmount), 1_000, 100e6);
        vm.startPrank(alice);
        usdc.approve(address(market), type(uint256).max);
        market.mintPositions(amount, alice);
        market.yesToken().approve(address(amm), type(uint256).max);
        (uint256 yesBefore, uint256 noBefore) = amm.reserves();
        amm.swapExactYesForNo(amount, 1, alice);
        (uint256 yesAfter, uint256 noAfter) = amm.reserves();
        vm.stopPrank();
        assertGe(yesAfter * noAfter, yesBefore * noBefore);
    }

    function testFeeCapsAndDelayedTreasuryChange() public {
        vm.expectRevert(ProtocolFeeControllerV2.InvalidFee.selector);
        fees.proposeFeeVersion(201, 0);
        fees.proposeFeeVersion(75, 125);
        vm.expectRevert(ProtocolFeeControllerV2.ChangeNotReady.selector);
        fees.activateFeeVersion();
        vm.warp(block.timestamp + fees.MIN_CHANGE_DELAY());
        fees.activateFeeVersion();
        assertEq(fees.latestFeeVersion(), 2);
        address nextTreasury = makeAddr("next-treasury");
        fees.proposeTreasury(nextTreasury);
        vm.expectRevert(ProtocolFeeControllerV2.ChangeNotReady.selector);
        vm.prank(nextTreasury);
        fees.acceptTreasury();
        vm.warp(block.timestamp + fees.MIN_CHANGE_DELAY());
        vm.prank(nextTreasury);
        fees.acceptTreasury();
        assertEq(fees.treasury(), nextTreasury);
    }

    function _create(string memory name, uint128 initialLiquidity)
        private
        returns (ArcSignalMarketV2 market, PredictionMarketAMMV2 amm)
    {
        (address marketAddress, address ammAddress) = factory.createMarket(_params(name, initialLiquidity));
        market = ArcSignalMarketV2(marketAddress);
        amm = PredictionMarketAMMV2(ammAddress);
    }

    function _params(string memory name, uint128 initialLiquidity) private view returns (MarketCreationParams memory) {
        uint64 close = uint64(block.timestamp + 1 days);
        return MarketCreationParams({
            marketId: keccak256(bytes(name)),
            metadataSchemaVersion: 1,
            categoryId: 1,
            categoryVersion: 1,
            oraclePolicyId: 1,
            oraclePolicyVersion: 1,
            closeTime: close,
            liveness: 2 hours,
            voidAfter: close + 4 hours,
            proposerBond: 10e6,
            oracleReward: 1e6,
            termsHash: keccak256(abi.encode(name, "terms")),
            resolutionSourceHash: keccak256(abi.encode(name, "source")),
            ancillaryData: abi.encode("Will the documented condition be true?", name),
            metadataURI: string.concat("ipfs://market/", name),
            thesisPredictsYes: true,
            initialLiquidity: initialLiquidity
        });
    }
}
