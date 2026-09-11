// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MarketCreationParams, MarketState, OracleState, BinaryOutcome} from "./ArcSignalTypes.sol";
import {OutcomeTokenV2} from "./OutcomeTokenV2.sol";
import {IArcSignalOracleAdapterV2} from "./interfaces/IArcSignalOracleAdapterV2.sol";
import {IExposureControllerV2} from "./interfaces/IExposureControllerV2.sol";
import {IOracleConsumerV2} from "./interfaces/IOracleConsumerV2.sol";

contract ArcSignalMarketV2 is ReentrancyGuard, IOracleConsumerV2 {
    using SafeERC20 for IERC20;

    uint16 public constant PROTOCOL_VERSION = 2;
    int256 public constant YES_PRICE = 1e18;
    int256 public constant NO_PRICE = 0;
    int256 public constant UNDETERMINED_PRICE = 5e17;
    uint256 public constant MAX_METADATA_URI_BYTES = 768;
    uint256 public constant MAX_ANCILLARY_DATA_BYTES = 4_096;

    bytes32 public immutable marketId;
    uint16 public immutable metadataSchemaVersion;
    uint32 public immutable categoryId;
    uint32 public immutable categoryVersion;
    uint32 public immutable oraclePolicyId;
    uint32 public immutable oraclePolicyVersion;
    uint32 public immutable feeVersion;
    uint64 public immutable closeTime;
    uint64 public immutable liveness;
    uint64 public immutable voidAfter;
    uint128 public immutable proposerBond;
    uint128 public immutable oracleReward;
    bytes32 public immutable termsHash;
    bytes32 public immutable resolutionSourceHash;
    bytes32 public immutable ancillaryDataHash;
    bool public immutable thesisPredictsYes;
    address public immutable factory;
    IERC20 public immutable collateral;
    IArcSignalOracleAdapterV2 public immutable oracleAdapter;
    bytes32 public immutable oracleIdentifier;
    OutcomeTokenV2 public immutable yesToken;
    OutcomeTokenV2 public immutable noToken;

    string public metadataURI;
    bytes public ancillaryData;
    address public amm;
    MarketState private _marketState;
    OracleState public oracleState;
    BinaryOutcome public outcome;
    bytes32 public oracleRequestKey;
    uint64 public resolutionRequestedAt;
    uint256 public collateralLiability;
    uint64 public resolvedAt;

    error InvalidConfiguration();
    error InvalidState();
    error InvalidAmount();
    error Unauthorized();
    error ExposurePaused();
    error ResolutionNotReady();
    error Insolvent();

    event MarketInitialized(
        bytes32 indexed marketId,
        address indexed market,
        address indexed factory,
        address collateral,
        address yesToken,
        address noToken,
        uint64 closeTime
    );
    event MarketPolicyCommitted(
        bytes32 indexed marketId,
        uint32 categoryId,
        uint32 categoryVersion,
        uint32 oraclePolicyId,
        uint32 oraclePolicyVersion,
        uint32 feeVersion,
        uint16 metadataSchemaVersion
    );
    event MarketTermsCommitted(
        bytes32 indexed marketId,
        bytes32 termsHash,
        bytes32 resolutionSourceHash,
        bytes32 ancillaryDataHash,
        string metadataURI
    );
    event AmmConfigured(bytes32 indexed marketId, address indexed amm);
    event PositionsMinted(bytes32 indexed marketId, address indexed payer, address indexed recipient, uint256 amount);
    event PairsRedeemed(bytes32 indexed marketId, address indexed account, uint256 amount);
    event MarketClosed(bytes32 indexed marketId, uint64 closedAt);
    event ResolutionRequested(bytes32 indexed marketId, bytes32 indexed requestKey, uint64 requestedAt);
    event ResolutionProposed(bytes32 indexed marketId, bytes32 indexed requestKey);
    event ResolutionDisputed(bytes32 indexed marketId, bytes32 indexed requestKey);
    event MarketResolved(
        bytes32 indexed marketId, bytes32 indexed requestKey, BinaryOutcome outcome, uint64 resolvedAt
    );
    event MarketVoided(bytes32 indexed marketId, uint64 voidedAt);
    event WinningsRedeemed(bytes32 indexed marketId, address indexed account, BinaryOutcome outcome, uint256 amount);
    event VoidRedemption(
        bytes32 indexed marketId, address indexed account, uint256 yesAmount, uint256 noAmount, uint256 payout
    );

    constructor(
        MarketCreationParams memory params,
        address collateral_,
        address oracleAdapter_,
        bytes32 oracleIdentifier_,
        uint32 feeVersion_,
        address factory_
    ) {
        if (
            params.marketId == bytes32(0) || params.metadataSchemaVersion == 0 || params.categoryId == 0
                || params.categoryVersion == 0 || params.oraclePolicyId == 0 || params.oraclePolicyVersion == 0
                || collateral_ == address(0) || oracleAdapter_ == address(0) || factory_ == address(0)
                || params.closeTime <= block.timestamp || params.voidAfter <= params.closeTime + params.liveness
                || params.termsHash == bytes32(0) || params.resolutionSourceHash == bytes32(0)
                || bytes(params.metadataURI).length == 0 || bytes(params.metadataURI).length > MAX_METADATA_URI_BYTES
                || params.ancillaryData.length == 0 || params.ancillaryData.length > MAX_ANCILLARY_DATA_BYTES
        ) revert InvalidConfiguration();
        if (IERC20Metadata(collateral_).decimals() != 6) revert InvalidConfiguration();

        factory = factory_;
        marketId = params.marketId;
        metadataSchemaVersion = params.metadataSchemaVersion;
        categoryId = params.categoryId;
        categoryVersion = params.categoryVersion;
        oraclePolicyId = params.oraclePolicyId;
        oraclePolicyVersion = params.oraclePolicyVersion;
        feeVersion = feeVersion_;
        closeTime = params.closeTime;
        liveness = params.liveness;
        voidAfter = params.voidAfter;
        proposerBond = params.proposerBond;
        oracleReward = params.oracleReward;
        termsHash = params.termsHash;
        resolutionSourceHash = params.resolutionSourceHash;
        ancillaryDataHash = keccak256(params.ancillaryData);
        thesisPredictsYes = params.thesisPredictsYes;
        metadataURI = params.metadataURI;
        ancillaryData = params.ancillaryData;
        collateral = IERC20(collateral_);
        oracleAdapter = IArcSignalOracleAdapterV2(oracleAdapter_);
        oracleIdentifier = oracleIdentifier_;
        _marketState = MarketState.OPEN;

        string memory suffix = _shortHex(params.marketId);
        yesToken = new OutcomeTokenV2("ArcSignal YES", string.concat("YES-", suffix), 6, address(this));
        noToken = new OutcomeTokenV2("ArcSignal NO", string.concat("NO-", suffix), 6, address(this));

        emit MarketInitialized(
            params.marketId, address(this), factory_, collateral_, address(yesToken), address(noToken), params.closeTime
        );
        emit MarketPolicyCommitted(
            params.marketId,
            params.categoryId,
            params.categoryVersion,
            params.oraclePolicyId,
            params.oraclePolicyVersion,
            feeVersion_,
            params.metadataSchemaVersion
        );
        emit MarketTermsCommitted(
            params.marketId,
            params.termsHash,
            params.resolutionSourceHash,
            keccak256(params.ancillaryData),
            params.metadataURI
        );
    }

    modifier onlyOracleAdapter() {
        if (msg.sender != address(oracleAdapter)) revert Unauthorized();
        _;
    }

    function setAmm(address amm_) external {
        if (msg.sender != factory || amm != address(0) || amm_ == address(0)) revert Unauthorized();
        amm = amm_;
        emit AmmConfigured(marketId, amm_);
    }

    function marketState() public view returns (MarketState) {
        if (_marketState == MarketState.OPEN && block.timestamp >= closeTime) return MarketState.CLOSED;
        return _marketState;
    }

    function marketStateIsOpen() external view returns (bool) {
        return marketState() == MarketState.OPEN;
    }

    function exposurePaused() public view returns (bool) {
        return IExposureControllerV2(factory).isExposurePaused(address(this));
    }

    function syncState() public returns (MarketState state) {
        _syncClosed();
        return _marketState;
    }

    function mintPositions(uint256 amount, address recipient) external nonReentrant {
        _mintPositions(msg.sender, recipient, amount);
    }

    function mintPositionsFor(address payer, address recipient, uint256 amount) external nonReentrant {
        if (msg.sender != amm) revert Unauthorized();
        _mintPositions(payer, recipient, amount);
    }

    function redeemPairs(uint256 amount, address recipient) external nonReentrant {
        if (amount == 0 || recipient == address(0)) revert InvalidAmount();
        MarketState state = marketState();
        if (state == MarketState.RESOLVED || state == MarketState.VOIDED) revert InvalidState();
        yesToken.burnFromMarket(msg.sender, amount);
        noToken.burnFromMarket(msg.sender, amount);
        collateralLiability -= amount;
        collateral.safeTransfer(recipient, amount);
        emit PairsRedeemed(marketId, msg.sender, amount);
    }

    function requestResolution() external nonReentrant returns (bytes32 requestKey) {
        _syncClosed();
        if (
            _marketState != MarketState.CLOSED || oracleState != OracleState.NONE
                || block.timestamp + liveness > voidAfter
        ) {
            revert InvalidState();
        }
        if (collateral.balanceOf(address(this)) < collateralLiability + oracleReward) revert Insolvent();
        if (oracleReward > 0) collateral.forceApprove(address(oracleAdapter), oracleReward);
        requestKey = oracleAdapter.requestResolution(
            marketId, oracleIdentifier, address(collateral), oracleReward, proposerBond, liveness, ancillaryData
        );
        oracleRequestKey = requestKey;
        resolutionRequestedAt = uint64(block.timestamp);
        oracleState = OracleState.REQUESTED;
        emit ResolutionRequested(marketId, requestKey, resolutionRequestedAt);
    }

    function settleResolution() external {
        if (oracleState == OracleState.NONE || oracleState == OracleState.SETTLED) revert InvalidState();
        oracleAdapter.settle(oracleRequestKey);
    }

    function voidExpiredMarket() external {
        _syncClosed();
        if (_marketState != MarketState.CLOSED || block.timestamp < voidAfter) revert ResolutionNotReady();
        _marketState = MarketState.VOIDED;
        outcome = BinaryOutcome.UNDETERMINED;
        resolvedAt = uint64(block.timestamp);
        emit MarketVoided(marketId, resolvedAt);
    }

    function onOracleProposed(bytes32 requestKey) external onlyOracleAdapter {
        if (_marketState == MarketState.VOIDED) return;
        _validateRequest(requestKey);
        if (oracleState != OracleState.REQUESTED) revert InvalidState();
        oracleState = OracleState.PROPOSED;
        emit ResolutionProposed(marketId, requestKey);
    }

    function onOracleDisputed(bytes32 requestKey) external onlyOracleAdapter {
        if (_marketState == MarketState.VOIDED) return;
        _validateRequest(requestKey);
        if (oracleState != OracleState.REQUESTED && oracleState != OracleState.PROPOSED) revert InvalidState();
        oracleState = OracleState.DISPUTED;
        emit ResolutionDisputed(marketId, requestKey);
    }

    function onOracleSettled(bytes32 requestKey, int256 settledPrice) external onlyOracleAdapter {
        if (_marketState == MarketState.VOIDED) return;
        _validateRequest(requestKey);
        if (oracleState == OracleState.NONE || oracleState == OracleState.SETTLED) revert InvalidState();

        BinaryOutcome finalOutcome;
        if (settledPrice == YES_PRICE) finalOutcome = BinaryOutcome.YES;
        else if (settledPrice == NO_PRICE) finalOutcome = BinaryOutcome.NO;
        else if (settledPrice == UNDETERMINED_PRICE) finalOutcome = BinaryOutcome.UNDETERMINED;
        else revert InvalidConfiguration();

        oracleState = OracleState.SETTLED;
        outcome = finalOutcome;
        resolvedAt = uint64(block.timestamp);
        _marketState = finalOutcome == BinaryOutcome.UNDETERMINED ? MarketState.VOIDED : MarketState.RESOLVED;
        emit MarketResolved(marketId, requestKey, finalOutcome, resolvedAt);
    }

    function redeemWinning(uint256 amount, address recipient) external nonReentrant {
        if (_marketState != MarketState.RESOLVED || amount == 0 || recipient == address(0)) revert InvalidState();
        if (outcome == BinaryOutcome.YES) yesToken.burnFromMarket(msg.sender, amount);
        else if (outcome == BinaryOutcome.NO) noToken.burnFromMarket(msg.sender, amount);
        else revert InvalidState();
        collateralLiability -= amount;
        collateral.safeTransfer(recipient, amount);
        emit WinningsRedeemed(marketId, msg.sender, outcome, amount);
    }

    function redeemVoided(uint256 yesAmount, uint256 noAmount, address recipient) external nonReentrant {
        if (_marketState != MarketState.VOIDED || recipient == address(0) || yesAmount + noAmount == 0) {
            revert InvalidState();
        }
        uint256 payout = (yesAmount + noAmount) / 2;
        if (payout == 0) revert InvalidAmount();
        if (yesAmount > 0) yesToken.burnFromMarket(msg.sender, yesAmount);
        if (noAmount > 0) noToken.burnFromMarket(msg.sender, noAmount);
        collateralLiability -= payout;
        collateral.safeTransfer(recipient, payout);
        emit VoidRedemption(marketId, msg.sender, yesAmount, noAmount, payout);
    }

    function _mintPositions(address payer, address recipient, uint256 amount) private {
        if (amount == 0 || payer == address(0) || recipient == address(0)) revert InvalidAmount();
        if (marketState() != MarketState.OPEN) revert InvalidState();
        if (exposurePaused()) revert ExposurePaused();
        collateral.safeTransferFrom(payer, address(this), amount);
        collateralLiability += amount;
        yesToken.mint(recipient, amount);
        noToken.mint(recipient, amount);
        emit PositionsMinted(marketId, payer, recipient, amount);
    }

    function _syncClosed() private {
        if (_marketState == MarketState.OPEN && block.timestamp >= closeTime) {
            _marketState = MarketState.CLOSED;
            emit MarketClosed(marketId, uint64(block.timestamp));
        }
    }

    function _validateRequest(bytes32 requestKey) private view {
        if (requestKey == bytes32(0) || requestKey != oracleRequestKey) revert Unauthorized();
    }

    function _shortHex(bytes32 value) private pure returns (string memory) {
        bytes16 alphabet = "0123456789abcdef";
        bytes memory out = new bytes(8);
        for (uint256 i; i < 4; ++i) {
            uint8 b = uint8(value[i]);
            out[i * 2] = alphabet[b >> 4];
            out[i * 2 + 1] = alphabet[b & 0x0f];
        }
        return string(out);
    }
}
