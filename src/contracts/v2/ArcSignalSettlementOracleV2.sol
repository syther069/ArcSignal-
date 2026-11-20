// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IArcSignalOracleAdapterV2} from "./interfaces/IArcSignalOracleAdapterV2.sol";
import {IOracleConsumerV2} from "./interfaces/IOracleConsumerV2.sol";

interface IMarketStateViewV2 {
    function marketState() external view returns (uint8);
}

/// @notice ArcSignal V2 settlement oracle. Acts as its own adapter (oracle() == address(this)).
/// Flow: market requests -> trusted proposer proposes -> anyone may dispute within liveness by
/// posting `bond` -> arbiter multisig arbitrates; or anyone settles after an undisputed liveness.
contract ArcSignalSettlementOracleV2 is IArcSignalOracleAdapterV2, ReentrancyGuard {
    using SafeERC20 for IERC20;

    int256 public constant YES_PRICE = 1e18;
    int256 public constant NO_PRICE = 0;
    int256 public constant UNDETERMINED_PRICE = 5e17;

    enum RequestState {
        NONE,
        REQUESTED,
        PROPOSED,
        DISPUTED,
        SETTLED
    }

    struct Request {
        address market;
        bytes32 marketId;
        bytes32 identifier;
        address rewardCurrency;
        uint256 reward;
        uint128 bond;
        uint64 liveness;
        uint64 requestedAt;
        uint64 proposedAt;
        RequestState state;
        int256 proposedPrice;
        int256 settledPrice;
        address disputer;
    }

    IERC20 public immutable bondToken;

    address public owner;
    address public proposer;
    address public arbiter;
    address public treasury;

    uint256 public requestNonce;
    mapping(bytes32 requestKey => Request) private _requests;
    mapping(address market => bytes32 requestKey) public marketRequest;

    error Unauthorized();
    error ZeroAddress();
    error InvalidPrice();
    error InvalidRequest();
    error InvalidState();
    error AlreadyRequested();
    error LivenessNotExpired();
    error LivenessExpired();
    error InvalidLiveness();

    event OwnerUpdated(address indexed previousOwner, address indexed newOwner);
    event ProposerUpdated(address indexed previousProposer, address indexed newProposer);
    event ArbiterUpdated(address indexed previousArbiter, address indexed newArbiter);
    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event ResolutionRequested(
        bytes32 indexed requestKey, address indexed market, bytes32 indexed marketId, uint256 reward, uint128 bond, uint64 liveness
    );
    event OutcomeProposed(bytes32 indexed requestKey, address indexed proposer, int256 price, uint64 expiresAt);
    event OutcomeDisputed(bytes32 indexed requestKey, address indexed disputer, uint128 bond);
    event OutcomeArbitrated(bytes32 indexed requestKey, int256 proposedPrice, int256 finalPrice, bool disputerWon);
    event DisputeBondRefunded(bytes32 indexed requestKey, address indexed disputer, uint128 amount);
    event DisputeBondForfeited(bytes32 indexed requestKey, address indexed treasury, uint128 amount);
    event RequestSettled(bytes32 indexed requestKey, address indexed market, int256 price);
    event VoidedRequestClosed(bytes32 indexed requestKey, address indexed market);

    /// @dev MarketState.VOIDED in ArcSignalTypes (OPEN, CLOSED, RESOLVED, VOIDED).
    uint8 private constant MARKET_STATE_VOIDED = 3;

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address owner_, address proposer_, address arbiter_, address bondToken_, address treasury_) {
        if (
            owner_ == address(0) || proposer_ == address(0) || arbiter_ == address(0) || bondToken_ == address(0)
                || treasury_ == address(0)
        ) revert ZeroAddress();
        owner = owner_;
        proposer = proposer_;
        arbiter = arbiter_;
        bondToken = IERC20(bondToken_);
        treasury = treasury_;
        emit OwnerUpdated(address(0), owner_);
        emit ProposerUpdated(address(0), proposer_);
        emit ArbiterUpdated(address(0), arbiter_);
        emit TreasuryUpdated(address(0), treasury_);
    }

    /// @notice Factory policy check: IOracleAdapterIdentityV2(adapter).oracle() == policy.oracle.
    function oracle() external view returns (address) {
        return address(this);
    }

    // ---------------------------------------------------------------- admin

    function setOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerUpdated(owner, newOwner);
        owner = newOwner;
    }

    function setProposer(address newProposer) external onlyOwner {
        if (newProposer == address(0)) revert ZeroAddress();
        emit ProposerUpdated(proposer, newProposer);
        proposer = newProposer;
    }

    function setArbiter(address newArbiter) external onlyOwner {
        if (newArbiter == address(0)) revert ZeroAddress();
        emit ArbiterUpdated(arbiter, newArbiter);
        arbiter = newArbiter;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    // ---------------------------------------------------------------- adapter

    /// @dev Called by the market itself; the market only calls this after close.
    function requestResolution(
        bytes32 marketId,
        bytes32 identifier,
        address currency,
        uint256 reward,
        uint128 bond,
        uint64 liveness,
        bytes calldata ancillaryData
    ) external nonReentrant returns (bytes32 requestKey) {
        if (liveness == 0) revert InvalidLiveness();
        if (marketRequest[msg.sender] != bytes32(0)) revert AlreadyRequested();

        requestKey = keccak256(abi.encode(block.chainid, address(this), msg.sender, marketId, ++requestNonce, ancillaryData));
        _requests[requestKey] = Request({
            market: msg.sender,
            marketId: marketId,
            identifier: identifier,
            rewardCurrency: currency,
            reward: reward,
            bond: bond,
            liveness: liveness,
            requestedAt: uint64(block.timestamp),
            proposedAt: 0,
            state: RequestState.REQUESTED,
            proposedPrice: 0,
            settledPrice: 0,
            disputer: address(0)
        });
        marketRequest[msg.sender] = requestKey;

        if (reward > 0) IERC20(currency).safeTransferFrom(msg.sender, address(this), reward);
        emit ResolutionRequested(requestKey, msg.sender, marketId, reward, bond, liveness);
    }

    function proposeOutcome(bytes32 requestKey, int256 price) external nonReentrant {
        if (msg.sender != proposer) revert Unauthorized();
        _requireValidPrice(price);
        Request storage r = _requests[requestKey];
        if (r.state == RequestState.NONE) revert InvalidRequest();
        if (r.state != RequestState.REQUESTED) revert InvalidState();

        r.state = RequestState.PROPOSED;
        r.proposedPrice = price;
        r.proposedAt = uint64(block.timestamp);
        emit OutcomeProposed(requestKey, msg.sender, price, uint64(block.timestamp) + r.liveness);
        IOracleConsumerV2(r.market).onOracleProposed(requestKey);
    }

    function disputeOutcome(bytes32 requestKey) external nonReentrant {
        Request storage r = _requests[requestKey];
        if (r.state == RequestState.NONE) revert InvalidRequest();
        if (r.state != RequestState.PROPOSED) revert InvalidState();
        if (block.timestamp >= uint256(r.proposedAt) + r.liveness) revert LivenessExpired();

        r.state = RequestState.DISPUTED;
        r.disputer = msg.sender;
        if (r.bond > 0) bondToken.safeTransferFrom(msg.sender, address(this), r.bond);
        emit OutcomeDisputed(requestKey, msg.sender, r.bond);
        IOracleConsumerV2(r.market).onOracleDisputed(requestKey);
    }

    function arbitrate(bytes32 requestKey, int256 finalPrice) external nonReentrant {
        if (msg.sender != arbiter) revert Unauthorized();
        _requireValidPrice(finalPrice);
        Request storage r = _requests[requestKey];
        if (r.state == RequestState.NONE) revert InvalidRequest();
        if (r.state != RequestState.DISPUTED) revert InvalidState();

        bool disputerWon = finalPrice != r.proposedPrice;
        emit OutcomeArbitrated(requestKey, r.proposedPrice, finalPrice, disputerWon);
        _finalize(requestKey, r, finalPrice);

        if (r.bond > 0) {
            if (disputerWon) {
                bondToken.safeTransfer(r.disputer, r.bond);
                emit DisputeBondRefunded(requestKey, r.disputer, r.bond);
            } else {
                bondToken.safeTransfer(treasury, r.bond);
                emit DisputeBondForfeited(requestKey, treasury, r.bond);
            }
        }
    }

    /// @notice Settles an undisputed proposal after liveness. Callable by anyone (including the market).
    function settle(bytes32 requestKey) external nonReentrant returns (int256 price) {
        Request storage r = _requests[requestKey];
        if (r.state == RequestState.NONE) revert InvalidRequest();
        if (r.state != RequestState.PROPOSED) revert InvalidState();
        if (block.timestamp < uint256(r.proposedAt) + r.liveness) revert LivenessNotExpired();

        price = r.proposedPrice;
        _finalize(requestKey, r, price);
    }

    /// @notice Recovery when the market voided (passed voidAfter) before this request settled, for
    /// example a dispute that was not arbitrated in time. Refunds a posted dispute bond to the disputer
    /// and sends any reward to the treasury, so no funds are stuck. Callable by anyone.
    function closeVoided(bytes32 requestKey) external nonReentrant {
        Request storage r = _requests[requestKey];
        if (r.state == RequestState.NONE) revert InvalidRequest();
        if (r.state == RequestState.SETTLED) revert InvalidState();
        if (IMarketStateViewV2(r.market).marketState() != MARKET_STATE_VOIDED) revert InvalidState();

        bool refundBond = r.state == RequestState.DISPUTED && r.bond > 0;
        r.state = RequestState.SETTLED;
        r.settledPrice = UNDETERMINED_PRICE;
        if (refundBond) {
            bondToken.safeTransfer(r.disputer, r.bond);
            emit DisputeBondRefunded(requestKey, r.disputer, r.bond);
        }
        if (r.reward > 0) IERC20(r.rewardCurrency).safeTransfer(treasury, r.reward);
        emit VoidedRequestClosed(requestKey, r.market);
    }

    // ---------------------------------------------------------------- views

    function getRequest(bytes32 requestKey) external view returns (Request memory) {
        return _requests[requestKey];
    }

    function isValidPrice(int256 price) public pure returns (bool) {
        return price == YES_PRICE || price == NO_PRICE || price == UNDETERMINED_PRICE;
    }

    // ---------------------------------------------------------------- internal

    function _finalize(bytes32 requestKey, Request storage r, int256 price) private {
        r.state = RequestState.SETTLED;
        r.settledPrice = price;
        if (r.reward > 0) IERC20(r.rewardCurrency).safeTransfer(treasury, r.reward);
        emit RequestSettled(requestKey, r.market, price);
        IOracleConsumerV2(r.market).onOracleSettled(requestKey, price);
    }

    function _requireValidPrice(int256 price) private pure {
        if (!isValidPrice(price)) revert InvalidPrice();
    }
}
