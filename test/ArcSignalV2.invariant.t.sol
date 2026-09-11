// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {MarketCreationParams, MarketState, OraclePolicyVersionData} from "../src/contracts/v2/ArcSignalTypes.sol";
import {CategoryRegistryV2} from "../src/contracts/v2/CategoryRegistryV2.sol";
import {OraclePolicyRegistryV2} from "../src/contracts/v2/OraclePolicyRegistryV2.sol";
import {ProtocolFeeControllerV2} from "../src/contracts/v2/ProtocolFeeControllerV2.sol";
import {UMAOracleAdapterV2} from "../src/contracts/v2/UMAOracleAdapterV2.sol";
import {ArcSignalFactoryV2} from "../src/contracts/v2/ArcSignalFactoryV2.sol";
import {ArcSignalMarketV2} from "../src/contracts/v2/ArcSignalMarketV2.sol";
import {ArcSignalMarketDeployerV2} from "../src/contracts/v2/ArcSignalMarketDeployerV2.sol";
import {PredictionMarketAMMDeployerV2} from "../src/contracts/v2/PredictionMarketAMMDeployerV2.sol";

contract InvariantUSDC is ERC20 {
    constructor() ERC20("Invariant USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}

contract InvariantOracle {
    function requestPrice(bytes32, uint256, bytes calldata, address, uint256) external pure returns (uint256) {
        return 0;
    }
    function setCustomLiveness(bytes32, uint256, bytes calldata, uint256) external {}

    function setBond(bytes32, uint256, bytes calldata, uint256 bond) external pure returns (uint256) {
        return bond;
    }
    function setEventBased(bytes32, uint256, bytes calldata) external {}

    function settleAndGetPrice(bytes32, uint256, bytes calldata) external pure returns (int256) {
        return 1e18;
    }
}

contract PositionHandler {
    InvariantUSDC public immutable usdc;
    ArcSignalMarketV2 public immutable market;

    constructor(InvariantUSDC usdc_, ArcSignalMarketV2 market_) {
        usdc = usdc_;
        market = market_;
        usdc.approve(address(market), type(uint256).max);
    }

    function mint(uint256 rawAmount) external {
        uint256 balance = usdc.balanceOf(address(this));
        if (balance == 0) return;
        market.mintPositions((rawAmount % balance) + 1, address(this));
    }

    function redeemPairs(uint256 rawAmount) external {
        uint256 paired = market.yesToken().balanceOf(address(this));
        uint256 noBalance = market.noToken().balanceOf(address(this));
        if (noBalance < paired) paired = noBalance;
        if (paired == 0) return;
        market.redeemPairs((rawAmount % paired) + 1, address(this));
    }
}

contract ArcSignalV2InvariantTest is StdInvariant, Test {
    InvariantUSDC private usdc;
    ArcSignalMarketV2 private market;
    PositionHandler private handler;

    function setUp() public {
        usdc = new InvariantUSDC();
        InvariantOracle oracle = new InvariantOracle();
        UMAOracleAdapterV2 adapter = new UMAOracleAdapterV2(address(oracle));
        CategoryRegistryV2 categories = new CategoryRegistryV2(address(this));
        OraclePolicyRegistryV2 policies = new OraclePolicyRegistryV2(address(this));
        ProtocolFeeControllerV2 fees = new ProtocolFeeControllerV2(address(this), address(this));
        categories.registerVersion(1, 1, keccak256("CRYPTO"), keccak256("binary-v1"), "ipfs://category");
        policies.registerVersion(
            1,
            1,
            OraclePolicyVersionData({
                adapter: address(adapter),
                oracle: address(oracle),
                bondCurrency: address(usdc),
                identifier: keccak256("YES_OR_NO_QUERY"),
                minLiveness: 1 hours,
                maxLiveness: 7 days,
                minBond: 1e6,
                rulesHash: keccak256("rules"),
                rulesURI: "ipfs://rules",
                activeForNewMarkets: true
            })
        );
        fees.registerFeeVersion(50, 100);
        ArcSignalMarketDeployerV2 marketDeployer = new ArcSignalMarketDeployerV2(address(this));
        PredictionMarketAMMDeployerV2 ammDeployer = new PredictionMarketAMMDeployerV2(address(this));
        ArcSignalFactoryV2 factory = new ArcSignalFactoryV2(
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
        usdc.mint(address(this), 1e6);
        usdc.approve(address(factory), 1e6);
        uint64 close = uint64(block.timestamp + 30 days);
        (address marketAddress,) = factory.createMarket(
            MarketCreationParams({
                marketId: keccak256("invariant-market"),
                metadataSchemaVersion: 1,
                categoryId: 1,
                categoryVersion: 1,
                oraclePolicyId: 1,
                oraclePolicyVersion: 1,
                closeTime: close,
                liveness: 2 hours,
                voidAfter: close + 4 hours,
                proposerBond: 1e6,
                oracleReward: 1e6,
                termsHash: keccak256("terms"),
                resolutionSourceHash: keccak256("source"),
                ancillaryData: abi.encode("invariant"),
                metadataURI: "ipfs://market",
                thesisPredictsYes: true,
                initialLiquidity: 0
            })
        );
        market = ArcSignalMarketV2(marketAddress);
        handler = new PositionHandler(usdc, market);
        usdc.mint(address(handler), 1_000_000e6);
        targetContract(address(handler));
    }

    function invariantCollateralCoversAllLiabilitiesAndOracleReward() public view {
        assertEq(usdc.balanceOf(address(market)), market.collateralLiability() + market.oracleReward());
    }

    function invariantOpenPairSuppliesMatchCollateralLiability() public view {
        assertEq(uint256(market.marketState()), uint256(MarketState.OPEN));
        assertEq(market.yesToken().totalSupply(), market.collateralLiability());
        assertEq(market.noToken().totalSupply(), market.collateralLiability());
    }
}
