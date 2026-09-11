// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MarketCreationParams, OraclePolicyVersionData} from "./ArcSignalTypes.sol";
import {CategoryRegistryV2} from "./CategoryRegistryV2.sol";
import {OraclePolicyRegistryV2} from "./OraclePolicyRegistryV2.sol";
import {ProtocolFeeControllerV2} from "./ProtocolFeeControllerV2.sol";
import {ArcSignalMarketV2} from "./ArcSignalMarketV2.sol";
import {PredictionMarketAMMV2} from "./PredictionMarketAMMV2.sol";
import {ArcSignalMarketDeployerV2} from "./ArcSignalMarketDeployerV2.sol";
import {PredictionMarketAMMDeployerV2} from "./PredictionMarketAMMDeployerV2.sol";
import {IExposureControllerV2} from "./interfaces/IExposureControllerV2.sol";

interface IOracleAdapterIdentityV2 {
    function oracle() external view returns (address);
}

contract ArcSignalFactoryV2 is AccessControl, ReentrancyGuard, IExposureControllerV2 {
    using SafeERC20 for IERC20;

    bytes32 public constant MARKET_CREATOR_ROLE = keccak256("MARKET_CREATOR_ROLE");
    bytes32 public constant RESOLUTION_OPERATOR_ROLE = keccak256("RESOLUTION_OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    uint256 public constant PROTOCOL_VERSION = 2;
    uint256 public constant MAX_CREATE_BATCH = 12;
    uint256 public constant MAX_MAINTENANCE_BATCH = 48;
    uint256 public constant MIN_INITIAL_LIQUIDITY = 1_000;

    IERC20 public immutable collateral;
    CategoryRegistryV2 public immutable categoryRegistry;
    OraclePolicyRegistryV2 public immutable oraclePolicyRegistry;
    ProtocolFeeControllerV2 public immutable feeController;
    ArcSignalMarketDeployerV2 public immutable marketDeployer;
    PredictionMarketAMMDeployerV2 public immutable ammDeployer;

    bool public globalExposurePaused;
    mapping(address market => bool paused) public marketExposurePaused;
    mapping(bytes32 marketId => address market) public marketById;
    mapping(address market => bool registered) public isRegisteredMarket;
    address[] private _markets;

    error InvalidConfiguration();
    error DuplicateMarket();
    error InvalidBatch();
    error UnsupportedPolicy();
    error FundingMismatch();
    error ExposurePaused();

    event MarketCreatedV2(
        bytes32 indexed marketId,
        address indexed market,
        address indexed creator,
        address amm,
        uint64 closeTime,
        uint64 voidAfter,
        uint256 initialLiquidity
    );
    event MarketVersionBindings(
        bytes32 indexed marketId,
        uint32 categoryId,
        uint32 categoryVersion,
        uint32 oraclePolicyId,
        uint32 oraclePolicyVersion,
        uint32 feeVersion,
        uint256 protocolVersion,
        uint16 metadataSchemaVersion
    );
    event GlobalExposurePauseChanged(bool paused, address indexed operator);
    event MarketExposurePauseChanged(address indexed market, bool paused, address indexed operator);
    event BatchResolutionAction(address indexed market, bytes4 indexed selector, bool success, bytes returnData);

    constructor(
        address admin,
        address collateral_,
        address categoryRegistry_,
        address oraclePolicyRegistry_,
        address feeController_,
        address marketDeployer_,
        address ammDeployer_
    ) {
        if (
            admin == address(0) || collateral_ == address(0) || categoryRegistry_ == address(0)
                || oraclePolicyRegistry_ == address(0) || feeController_ == address(0) || marketDeployer_ == address(0)
                || ammDeployer_ == address(0)
        ) revert InvalidConfiguration();
        if (
            collateral_.code.length == 0 || categoryRegistry_.code.length == 0 || oraclePolicyRegistry_.code.length == 0
                || feeController_.code.length == 0 || marketDeployer_.code.length == 0 || ammDeployer_.code.length == 0
        ) revert InvalidConfiguration();
        collateral = IERC20(collateral_);
        categoryRegistry = CategoryRegistryV2(categoryRegistry_);
        oraclePolicyRegistry = OraclePolicyRegistryV2(oraclePolicyRegistry_);
        feeController = ProtocolFeeControllerV2(feeController_);
        marketDeployer = ArcSignalMarketDeployerV2(marketDeployer_);
        ammDeployer = PredictionMarketAMMDeployerV2(ammDeployer_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MARKET_CREATOR_ROLE, admin);
        _grantRole(RESOLUTION_OPERATOR_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    function createMarket(MarketCreationParams calldata params)
        external
        onlyRole(MARKET_CREATOR_ROLE)
        nonReentrant
        returns (address market, address amm)
    {
        if (globalExposurePaused) revert ExposurePaused();
        return _createMarket(params, msg.sender);
    }

    function createMarkets(MarketCreationParams[] calldata params)
        external
        onlyRole(MARKET_CREATOR_ROLE)
        nonReentrant
        returns (address[] memory markets, address[] memory amms)
    {
        if (globalExposurePaused) revert ExposurePaused();
        uint256 length = params.length;
        if (length == 0 || length > MAX_CREATE_BATCH) revert InvalidBatch();
        markets = new address[](length);
        amms = new address[](length);
        for (uint256 i; i < length; ++i) {
            (markets[i], amms[i]) = _createMarket(params[i], msg.sender);
        }
    }

    function setGlobalExposurePaused(bool paused) external onlyRole(PAUSER_ROLE) {
        globalExposurePaused = paused;
        emit GlobalExposurePauseChanged(paused, msg.sender);
    }

    function setMarketExposurePaused(address market, bool paused) external onlyRole(PAUSER_ROLE) {
        if (!isRegisteredMarket[market]) revert InvalidConfiguration();
        marketExposurePaused[market] = paused;
        emit MarketExposurePauseChanged(market, paused, msg.sender);
    }

    function isExposurePaused(address market) external view returns (bool) {
        return globalExposurePaused || marketExposurePaused[market];
    }

    function batchRequestResolution(address[] calldata markets) external onlyRole(RESOLUTION_OPERATOR_ROLE) {
        _runBatch(markets, ArcSignalMarketV2.requestResolution.selector);
    }

    function batchSettleResolution(address[] calldata markets) external {
        _runBatch(markets, ArcSignalMarketV2.settleResolution.selector);
    }

    function batchSyncState(address[] calldata markets) external {
        _runBatch(markets, ArcSignalMarketV2.syncState.selector);
    }

    function batchVoidExpired(address[] calldata markets) external onlyRole(RESOLUTION_OPERATOR_ROLE) {
        _runBatch(markets, ArcSignalMarketV2.voidExpiredMarket.selector);
    }

    function marketCount() external view returns (uint256) {
        return _markets.length;
    }

    function marketAt(uint256 index) external view returns (address) {
        return _markets[index];
    }

    function allMarkets() external view returns (address[] memory) {
        return _markets;
    }

    function _createMarket(MarketCreationParams calldata params, address creator)
        private
        returns (address marketAddress, address ammAddress)
    {
        if (marketById[params.marketId] != address(0)) revert DuplicateMarket();
        if (params.initialLiquidity > 0 && params.initialLiquidity <= MIN_INITIAL_LIQUIDITY) {
            revert InvalidConfiguration();
        }
        if (!categoryRegistry.isActive(params.categoryId, params.categoryVersion)) revert InvalidConfiguration();
        if (!oraclePolicyRegistry.isActive(params.oraclePolicyId, params.oraclePolicyVersion)) {
            revert InvalidConfiguration();
        }
        OraclePolicyVersionData memory policy =
            oraclePolicyRegistry.getVersion(params.oraclePolicyId, params.oraclePolicyVersion);
        if (
            policy.bondCurrency != address(collateral) || params.liveness < policy.minLiveness
                || params.liveness > policy.maxLiveness || params.proposerBond < policy.minBond
                || policy.adapter.code.length == 0 || IOracleAdapterIdentityV2(policy.adapter).oracle() != policy.oracle
        ) revert UnsupportedPolicy();

        uint32 feeVersion = feeController.latestFeeVersion();
        (uint16 protocolFeeBps, uint16 lpFeeBps, bool feeExists) = feeController.feeVersions(feeVersion);
        if (!feeExists) revert InvalidConfiguration();

        bytes32 salt = keccak256(abi.encode(block.chainid, params.marketId));
        ArcSignalMarketV2 market = ArcSignalMarketV2(
            marketDeployer.deploy(params, address(collateral), policy.adapter, policy.identifier, feeVersion, salt)
        );
        PredictionMarketAMMV2 amm = PredictionMarketAMMV2(
            ammDeployer.deploy(address(market), address(feeController), protocolFeeBps, lpFeeBps)
        );
        market.setAmm(address(amm));

        marketAddress = address(market);
        ammAddress = address(amm);
        marketById[params.marketId] = marketAddress;
        isRegisteredMarket[marketAddress] = true;
        _markets.push(marketAddress);

        uint256 funding = uint256(params.oracleReward) + uint256(params.initialLiquidity);
        if (funding > 0) {
            uint256 beforeBalance = collateral.balanceOf(address(this));
            collateral.safeTransferFrom(creator, address(this), funding);
            if (collateral.balanceOf(address(this)) - beforeBalance != funding) revert FundingMismatch();
        }
        if (params.oracleReward > 0) collateral.safeTransfer(marketAddress, params.oracleReward);
        if (params.initialLiquidity > 0) {
            collateral.forceApprove(marketAddress, params.initialLiquidity);
            amm.seedFromFactory(params.initialLiquidity, creator);
        }

        _emitMarketCreated(params, creator, marketAddress, ammAddress, feeVersion);
    }

    function _runBatch(address[] calldata markets, bytes4 selector) private {
        uint256 length = markets.length;
        if (length == 0 || length > MAX_MAINTENANCE_BATCH) revert InvalidBatch();
        for (uint256 i; i < length; ++i) {
            address market = markets[i];
            if (!isRegisteredMarket[market]) {
                emit BatchResolutionAction(market, selector, false, bytes("UNREGISTERED_MARKET"));
                continue;
            }
            (bool success, bytes memory result) = market.call(abi.encodeWithSelector(selector));
            emit BatchResolutionAction(market, selector, success, result);
        }
    }

    function _emitMarketCreated(
        MarketCreationParams calldata params,
        address creator,
        address market,
        address amm,
        uint32 feeVersion
    ) private {
        emit MarketCreatedV2(
            params.marketId, market, creator, amm, params.closeTime, params.voidAfter, params.initialLiquidity
        );
        emit MarketVersionBindings(
            params.marketId,
            params.categoryId,
            params.categoryVersion,
            params.oraclePolicyId,
            params.oraclePolicyVersion,
            feeVersion,
            PROTOCOL_VERSION,
            params.metadataSchemaVersion
        );
    }
}
