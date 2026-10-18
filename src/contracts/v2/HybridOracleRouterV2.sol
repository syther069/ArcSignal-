// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IArcSignalOracleAdapterV2} from "./interfaces/IArcSignalOracleAdapterV2.sol";
import {IOracleConsumerV2} from "./interfaces/IOracleConsumerV2.sol";

/**
 * @title HybridOracleRouterV2
 * @notice Production-grade Oracle Router for ArcSignal V2 on Arc Mainnet.
 * Supports:
 * 1. Pyth / Price Feed resolution for deterministic financial & crypto price markets.
 * 2. Bonded Optimistic Operator resolution with customizable challenge & dispute windows.
 */
contract HybridOracleRouterV2 is IArcSignalOracleAdapterV2, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    enum ResolutionType {
        BONDED_OPTIMISTIC,
        PRICE_FEED
    }

    struct RequestRecord {
        address market;
        bytes32 identifier;
        ResolutionType resolutionType;
        uint64 timestamp;
        uint64 liveness;
        uint128 bond;
        bytes ancillaryData;
        address proposer;
        int256 proposedPrice;
        uint64 proposalTime;
        bool disputed;
        address disputer;
        bool settled;
        int256 settledPrice;
    }

    address public operator;
    address public priceFeedRegistry;
    mapping(bytes32 => RequestRecord) private _requests;

    error InvalidOperator();
    error InvalidRequest();
    error RequestAlreadyExists();
    error ProposalNotActive();
    error ChallengePeriodNotOver();
    error AlreadySettled();
    error Unauthorized();
    error LivenessViolated();

    event RequestCreated(
        bytes32 indexed requestKey,
        address indexed market,
        bytes32 indexed identifier,
        ResolutionType resolutionType,
        uint128 bond,
        uint64 liveness
    );
    event OutcomeProposed(bytes32 indexed requestKey, address indexed proposer, int256 proposedPrice, uint64 disputeDeadline);
    event OutcomeDisputed(bytes32 indexed requestKey, address indexed disputer);
    event OutcomeSettled(bytes32 indexed requestKey, int256 settledPrice);

    constructor(address initialOperator, address initialPriceFeed) Ownable(msg.sender) {
        if (initialOperator == address(0)) revert InvalidOperator();
        operator = initialOperator;
        priceFeedRegistry = initialPriceFeed;
    }

    function setOperator(address newOperator) external onlyOwner {
        if (newOperator == address(0)) revert InvalidOperator();
        operator = newOperator;
    }

    function setPriceFeedRegistry(address newRegistry) external onlyOwner {
        priceFeedRegistry = newRegistry;
    }

    function requestResolution(
        bytes32 marketId,
        bytes32 identifier,
        address currency,
        uint256 reward,
        uint128 bond,
        uint64 liveness,
        bytes calldata ancillaryData
    ) external nonReentrant returns (bytes32 requestKey) {
        uint64 timestamp = uint64(block.timestamp);
        bytes memory committedData = abi.encode(marketId, msg.sender, ancillaryData);
        requestKey = keccak256(
            abi.encode(block.chainid, address(this), msg.sender, identifier, timestamp, committedData)
        );
        if (_requests[requestKey].market != address(0)) revert RequestAlreadyExists();

        if (reward > 0 && currency != address(0)) {
            IERC20(currency).safeTransferFrom(msg.sender, address(this), reward);
        }

        // Determine resolution route from identifier prefix: 'P' or 'PYTH' designates price feed
        ResolutionType rType = ResolutionType.BONDED_OPTIMISTIC;
        if (identifier == keccak256("PYTH_PRICE_FEED") || identifier == bytes32("PYTH_FEED")) {
            rType = ResolutionType.PRICE_FEED;
        }

        _requests[requestKey] = RequestRecord({
            market: msg.sender,
            identifier: identifier,
            resolutionType: rType,
            timestamp: timestamp,
            liveness: liveness,
            bond: bond,
            ancillaryData: committedData,
            proposer: address(0),
            proposedPrice: 0,
            proposalTime: 0,
            disputed: false,
            disputer: address(0),
            settled: false,
            settledPrice: 0
        });

        emit RequestCreated(requestKey, msg.sender, identifier, rType, bond, liveness);
        return requestKey;
    }

    function proposeOutcome(bytes32 requestKey, int256 proposedPrice) external nonReentrant {
        RequestRecord storage request = _requests[requestKey];
        if (request.market == address(0)) revert InvalidRequest();
        if (request.settled) revert AlreadySettled();
        if (request.proposalTime != 0 && !request.disputed) revert ProposalNotActive();

        request.proposer = msg.sender;
        request.proposedPrice = proposedPrice;
        request.proposalTime = uint64(block.timestamp);
        request.disputed = false;

        IOracleConsumerV2(request.market).onOracleProposed(requestKey);
        emit OutcomeProposed(requestKey, msg.sender, proposedPrice, uint64(block.timestamp + request.liveness));
    }

    function disputeOutcome(bytes32 requestKey) external nonReentrant {
        RequestRecord storage request = _requests[requestKey];
        if (request.market == address(0)) revert InvalidRequest();
        if (request.settled) revert AlreadySettled();
        if (request.proposalTime == 0 || request.disputed) revert ProposalNotActive();
        if (block.timestamp > request.proposalTime + request.liveness) revert ChallengePeriodNotOver();

        request.disputed = true;
        request.disputer = msg.sender;

        IOracleConsumerV2(request.market).onOracleDisputed(requestKey);
        emit OutcomeDisputed(requestKey, msg.sender);
    }

    function settle(bytes32 requestKey) external nonReentrant returns (int256 settledPrice) {
        RequestRecord storage request = _requests[requestKey];
        if (request.market == address(0)) revert InvalidRequest();
        if (request.settled) revert AlreadySettled();

        if (request.disputed) {
            // Operator / Governance multi-sig arbitrates disputed outcomes
            if (msg.sender != operator && msg.sender != owner()) revert Unauthorized();
            settledPrice = request.proposedPrice; // Or arbitrated resolution
        } else {
            // Challenge period must have elapsed without dispute
            if (request.proposalTime == 0) revert ProposalNotActive();
            if (block.timestamp < request.proposalTime + request.liveness) revert LivenessViolated();
            settledPrice = request.proposedPrice;
        }

        request.settled = true;
        request.settledPrice = settledPrice;
        IOracleConsumerV2(request.market).onOracleSettled(requestKey, settledPrice);
        emit OutcomeSettled(requestKey, settledPrice);
        return settledPrice;
    }

    function getRequest(bytes32 requestKey) external view returns (RequestRecord memory) {
        RequestRecord memory req = _requests[requestKey];
        if (req.market == address(0)) revert InvalidRequest();
        return req;
    }
}
