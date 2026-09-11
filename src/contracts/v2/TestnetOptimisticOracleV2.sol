// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface TestnetOptimisticRequester {
    function priceProposed(bytes32 identifier, uint256 timestamp, bytes calldata ancillaryData) external;
    function priceDisputed(bytes32 identifier, uint256 timestamp, bytes calldata ancillaryData, uint256 refund) external;
    function priceSettled(bytes32 identifier, uint256 timestamp, bytes calldata ancillaryData, int256 price) external;
}

contract TestnetOptimisticOracleV2 {
    using SafeERC20 for IERC20;

    enum State {
        Invalid,
        Requested,
        Proposed,
        Disputed,
        Settled
    }

    struct Request {
        address requester;
        address currency;
        uint256 reward;
        uint256 bond;
        uint256 liveness;
        uint256 expirationTimestamp;
        int256 proposedPrice;
        int256 settledPrice;
        bool eventBased;
        State state;
    }

    mapping(bytes32 key => Request request) private _requests;

    error InvalidRequest();
    error InvalidState();
    error LivenessNotExpired();

    event RequestPrice(
        address indexed requester,
        bytes32 indexed identifier,
        uint256 timestamp,
        bytes ancillaryData,
        address currency,
        uint256 reward,
        uint256 finalFee
    );
    event ProposePrice(
        address indexed requester,
        address indexed proposer,
        bytes32 indexed identifier,
        uint256 timestamp,
        bytes ancillaryData,
        int256 proposedPrice,
        uint256 expirationTimestamp,
        address currency
    );
    event DisputePrice(
        address indexed requester,
        address indexed proposer,
        address indexed disputer,
        bytes32 identifier,
        uint256 timestamp,
        bytes ancillaryData,
        int256 proposedPrice
    );
    event Settle(
        address indexed requester,
        address indexed proposer,
        address indexed disputer,
        bytes32 identifier,
        uint256 timestamp,
        bytes ancillaryData,
        int256 price,
        uint256 payout
    );

    function requestPrice(
        bytes32 identifier,
        uint256 timestamp,
        bytes calldata ancillaryData,
        address currency,
        uint256 reward
    ) external returns (uint256) {
        bytes32 key = _key(msg.sender, identifier, timestamp, ancillaryData);
        if (_requests[key].state != State.Invalid) revert InvalidState();
        if (reward > 0) IERC20(currency).safeTransferFrom(msg.sender, address(this), reward);
        _requests[key] = Request({
            requester: msg.sender,
            currency: currency,
            reward: reward,
            bond: 0,
            liveness: 60,
            expirationTimestamp: 0,
            proposedPrice: 0,
            settledPrice: 0,
            eventBased: false,
            state: State.Requested
        });
        emit RequestPrice(msg.sender, identifier, timestamp, ancillaryData, currency, reward, 0);
        return 0;
    }

    function setCustomLiveness(bytes32 identifier, uint256 timestamp, bytes calldata ancillaryData, uint256 liveness)
        external
    {
        Request storage request = _requested(msg.sender, identifier, timestamp, ancillaryData);
        request.liveness = liveness;
    }

    function setBond(bytes32 identifier, uint256 timestamp, bytes calldata ancillaryData, uint256 bond)
        external
        returns (uint256)
    {
        Request storage request = _requested(msg.sender, identifier, timestamp, ancillaryData);
        request.bond = bond;
        return bond;
    }

    function setEventBased(bytes32 identifier, uint256 timestamp, bytes calldata ancillaryData) external {
        Request storage request = _requested(msg.sender, identifier, timestamp, ancillaryData);
        request.eventBased = true;
    }

    function proposePrice(
        address requester,
        bytes32 identifier,
        uint256 timestamp,
        bytes calldata ancillaryData,
        int256 proposedPrice
    ) external returns (uint256 totalBond) {
        Request storage request = _requested(requester, identifier, timestamp, ancillaryData);
        if (request.state != State.Requested) revert InvalidState();
        totalBond = request.bond;
        if (totalBond > 0) IERC20(request.currency).safeTransferFrom(msg.sender, address(this), totalBond);
        request.proposedPrice = proposedPrice;
        request.expirationTimestamp = block.timestamp + request.liveness;
        request.state = State.Proposed;
        emit ProposePrice(
            requester,
            msg.sender,
            identifier,
            timestamp,
            ancillaryData,
            proposedPrice,
            request.expirationTimestamp,
            request.currency
        );
        if (requester.code.length > 0) {
            TestnetOptimisticRequester(requester).priceProposed(identifier, timestamp, ancillaryData);
        }
    }

    function disputePrice(address requester, bytes32 identifier, uint256 timestamp, bytes calldata ancillaryData)
        external
    {
        Request storage request = _requested(requester, identifier, timestamp, ancillaryData);
        if (request.state != State.Proposed) revert InvalidState();
        if (request.bond > 0) IERC20(request.currency).safeTransferFrom(msg.sender, address(this), request.bond);
        request.state = State.Disputed;
        emit DisputePrice(
            requester, address(0), msg.sender, identifier, timestamp, ancillaryData, request.proposedPrice
        );
        if (requester.code.length > 0) {
            TestnetOptimisticRequester(requester).priceDisputed(identifier, timestamp, ancillaryData, request.reward);
        }
    }

    function setDisputedPrice(
        address requester,
        bytes32 identifier,
        uint256 timestamp,
        bytes calldata ancillaryData,
        int256 price
    ) external {
        Request storage request = _requested(requester, identifier, timestamp, ancillaryData);
        if (request.state != State.Disputed) revert InvalidState();
        request.settledPrice = price;
    }

    function settleAndGetPrice(bytes32 identifier, uint256 timestamp, bytes calldata ancillaryData)
        external
        returns (int256)
    {
        Request storage request = _requested(msg.sender, identifier, timestamp, ancillaryData);
        if (request.state == State.Settled) return request.settledPrice;
        if (request.state == State.Proposed && block.timestamp < request.expirationTimestamp) {
            revert LivenessNotExpired();
        }
        if (request.state != State.Proposed && request.state != State.Disputed) revert InvalidState();
        int256 price = request.state == State.Disputed ? request.settledPrice : request.proposedPrice;
        request.settledPrice = price;
        request.state = State.Settled;
        emit Settle(msg.sender, address(0), address(0), identifier, timestamp, ancillaryData, price, 0);
        if (msg.sender.code.length > 0) {
            TestnetOptimisticRequester(msg.sender).priceSettled(identifier, timestamp, ancillaryData, price);
        }
        return price;
    }

    function getRequest(address requester, bytes32 identifier, uint256 timestamp, bytes calldata ancillaryData)
        external
        view
        returns (Request memory)
    {
        Request memory request = _requests[_key(requester, identifier, timestamp, ancillaryData)];
        if (request.state == State.Invalid) revert InvalidRequest();
        return request;
    }

    function _requested(address requester, bytes32 identifier, uint256 timestamp, bytes calldata ancillaryData)
        private
        view
        returns (Request storage request)
    {
        request = _requests[_key(requester, identifier, timestamp, ancillaryData)];
        if (request.state == State.Invalid) revert InvalidRequest();
    }

    function _key(address requester, bytes32 identifier, uint256 timestamp, bytes calldata ancillaryData)
        private
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(requester, identifier, timestamp, ancillaryData));
    }
}
