// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IOptimisticOracleV2} from "./interfaces/IOptimisticOracleV2.sol";
import {IOracleConsumerV2} from "./interfaces/IOracleConsumerV2.sol";

contract UMAOracleAdapterV2 is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct RequestRecord {
        address market;
        bytes32 identifier;
        uint64 timestamp;
        uint64 liveness;
        uint128 bond;
        bytes ancillaryData;
        bool settled;
    }

    IOptimisticOracleV2 public immutable oracle;
    mapping(bytes32 requestKey => RequestRecord) private _requests;
    mapping(bytes32 callbackKey => bytes32 requestKey) private _callbackKeys;

    error InvalidOracle();
    error InvalidRequest();
    error UnauthorizedCallback();
    error AlreadySettled();

    event AdapterRequestCreated(
        bytes32 indexed requestKey,
        address indexed market,
        bytes32 indexed identifier,
        uint64 timestamp,
        uint64 liveness,
        uint128 bond,
        bytes32 ancillaryDataHash
    );
    event AdapterProposalObserved(bytes32 indexed requestKey);
    event AdapterDisputeObserved(bytes32 indexed requestKey);
    event AdapterSettlementObserved(bytes32 indexed requestKey, int256 settledPrice);

    constructor(address oracleAddress) {
        if (oracleAddress == address(0)) revert InvalidOracle();
        oracle = IOptimisticOracleV2(oracleAddress);
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
            abi.encode(block.chainid, address(oracle), address(this), msg.sender, identifier, timestamp, committedData)
        );
        if (_requests[requestKey].market != address(0)) revert InvalidRequest();

        if (reward > 0) {
            IERC20(currency).safeTransferFrom(msg.sender, address(this), reward);
            IERC20(currency).forceApprove(address(oracle), reward);
        }
        oracle.requestPrice(identifier, timestamp, committedData, currency, reward);
        oracle.setCustomLiveness(identifier, timestamp, committedData, liveness);
        oracle.setBond(identifier, timestamp, committedData, bond);
        oracle.setEventBased(identifier, timestamp, committedData);

        bytes32 callbackKey = keccak256(abi.encode(identifier, timestamp, committedData));
        _requests[requestKey] = RequestRecord({
            market: msg.sender,
            identifier: identifier,
            timestamp: timestamp,
            liveness: liveness,
            bond: bond,
            ancillaryData: committedData,
            settled: false
        });
        _callbackKeys[callbackKey] = requestKey;
        emit AdapterRequestCreated(
            requestKey, msg.sender, identifier, timestamp, liveness, bond, keccak256(committedData)
        );
        return requestKey;
    }

    function settle(bytes32 requestKey) external nonReentrant returns (int256 settledPrice) {
        RequestRecord storage request = _requests[requestKey];
        if (request.market == address(0)) revert InvalidRequest();
        if (request.settled) revert AlreadySettled();
        settledPrice = oracle.settleAndGetPrice(request.identifier, request.timestamp, request.ancillaryData);
        if (!request.settled) {
            request.settled = true;
            IOracleConsumerV2(request.market).onOracleSettled(requestKey, settledPrice);
            emit AdapterSettlementObserved(requestKey, settledPrice);
        }
    }

    function priceProposed(bytes32 identifier, uint256 timestamp, bytes calldata ancillaryData) external {
        bytes32 requestKey = _validatedCallback(identifier, timestamp, ancillaryData);
        IOracleConsumerV2(_requests[requestKey].market).onOracleProposed(requestKey);
        emit AdapterProposalObserved(requestKey);
    }

    function priceDisputed(bytes32 identifier, uint256 timestamp, bytes calldata ancillaryData, uint256) external {
        bytes32 requestKey = _validatedCallback(identifier, timestamp, ancillaryData);
        IOracleConsumerV2(_requests[requestKey].market).onOracleDisputed(requestKey);
        emit AdapterDisputeObserved(requestKey);
    }

    function priceSettled(bytes32 identifier, uint256 timestamp, bytes calldata ancillaryData, int256 price) external {
        bytes32 requestKey = _validatedCallback(identifier, timestamp, ancillaryData);
        RequestRecord storage request = _requests[requestKey];
        if (request.settled) return;
        request.settled = true;
        IOracleConsumerV2(request.market).onOracleSettled(requestKey, price);
        emit AdapterSettlementObserved(requestKey, price);
    }

    function getRequest(bytes32 requestKey) external view returns (RequestRecord memory) {
        RequestRecord memory request = _requests[requestKey];
        if (request.market == address(0)) revert InvalidRequest();
        return request;
    }

    function _validatedCallback(bytes32 identifier, uint256 timestamp, bytes calldata ancillaryData)
        private
        view
        returns (bytes32 requestKey)
    {
        if (msg.sender != address(oracle)) revert UnauthorizedCallback();
        requestKey = _callbackKeys[keccak256(abi.encode(identifier, timestamp, ancillaryData))];
        if (requestKey == bytes32(0)) revert InvalidRequest();
    }
}
