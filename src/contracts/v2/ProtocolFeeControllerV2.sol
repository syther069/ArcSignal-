// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ProtocolFeeControllerV2 is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant FEE_ADMIN_ROLE = keccak256("FEE_ADMIN_ROLE");
    uint16 public constant MAX_PROTOCOL_FEE_BPS = 200;
    uint16 public constant MAX_LP_FEE_BPS = 300;
    uint64 public constant MIN_CHANGE_DELAY = 2 days;

    struct FeeVersion {
        uint16 protocolFeeBps;
        uint16 lpFeeBps;
        bool exists;
    }

    struct PendingTreasury {
        address account;
        uint64 executableAt;
    }

    struct PendingFeeVersion {
        uint16 protocolFeeBps;
        uint16 lpFeeBps;
        uint64 executableAt;
    }

    address public treasury;
    PendingTreasury public pendingTreasury;
    PendingFeeVersion public pendingFeeVersion;
    uint32 public latestFeeVersion;
    mapping(uint32 version => FeeVersion) public feeVersions;
    mapping(address token => uint256 amount) public accruedFees;

    error InvalidFee();
    error InvalidTreasury();
    error ChangeNotReady();
    error BootstrapComplete();

    event FeeVersionRegistered(uint32 indexed version, uint16 protocolFeeBps, uint16 lpFeeBps);
    event FeeVersionProposed(uint16 protocolFeeBps, uint16 lpFeeBps, uint64 executableAt);
    event FeeVersionProposalCancelled(uint16 protocolFeeBps, uint16 lpFeeBps);
    event TreasuryChangeProposed(
        address indexed currentTreasury, address indexed proposedTreasury, uint64 executableAt
    );
    event TreasuryChangeCancelled(address indexed proposedTreasury);
    event TreasuryChanged(address indexed previousTreasury, address indexed newTreasury);
    event FeesAccrued(address indexed token, uint256 amount, uint256 totalAccrued);
    event FeesWithdrawn(address indexed token, address indexed treasury, uint256 amount);

    constructor(address admin, address initialTreasury) {
        if (admin == address(0) || initialTreasury == address(0)) revert InvalidTreasury();
        treasury = initialTreasury;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FEE_ADMIN_ROLE, admin);
    }

    function registerFeeVersion(uint16 protocolFeeBps, uint16 lpFeeBps)
        external
        onlyRole(FEE_ADMIN_ROLE)
        returns (uint32 version)
    {
        if (latestFeeVersion != 0) revert BootstrapComplete();
        return _registerFeeVersion(protocolFeeBps, lpFeeBps);
    }

    function proposeFeeVersion(uint16 protocolFeeBps, uint16 lpFeeBps) external onlyRole(FEE_ADMIN_ROLE) {
        if (protocolFeeBps > MAX_PROTOCOL_FEE_BPS || lpFeeBps > MAX_LP_FEE_BPS) {
            revert InvalidFee();
        }
        uint64 executableAt = uint64(block.timestamp + MIN_CHANGE_DELAY);
        pendingFeeVersion = PendingFeeVersion(protocolFeeBps, lpFeeBps, executableAt);
        emit FeeVersionProposed(protocolFeeBps, lpFeeBps, executableAt);
    }

    function activateFeeVersion() external onlyRole(FEE_ADMIN_ROLE) returns (uint32 version) {
        PendingFeeVersion memory pending = pendingFeeVersion;
        if (pending.executableAt == 0) revert InvalidFee();
        if (block.timestamp < pending.executableAt) revert ChangeNotReady();
        delete pendingFeeVersion;
        return _registerFeeVersion(pending.protocolFeeBps, pending.lpFeeBps);
    }

    function cancelFeeVersionProposal() external onlyRole(FEE_ADMIN_ROLE) {
        PendingFeeVersion memory pending = pendingFeeVersion;
        if (pending.executableAt == 0) revert InvalidFee();
        delete pendingFeeVersion;
        emit FeeVersionProposalCancelled(pending.protocolFeeBps, pending.lpFeeBps);
    }

    function _registerFeeVersion(uint16 protocolFeeBps, uint16 lpFeeBps) private returns (uint32 version) {
        if (protocolFeeBps > MAX_PROTOCOL_FEE_BPS || lpFeeBps > MAX_LP_FEE_BPS) revert InvalidFee();
        version = ++latestFeeVersion;
        feeVersions[version] = FeeVersion(protocolFeeBps, lpFeeBps, true);
        emit FeeVersionRegistered(version, protocolFeeBps, lpFeeBps);
    }

    function proposeTreasury(address nextTreasury) external onlyRole(FEE_ADMIN_ROLE) {
        if (nextTreasury == address(0) || nextTreasury == treasury) revert InvalidTreasury();
        uint64 executableAt = uint64(block.timestamp + MIN_CHANGE_DELAY);
        pendingTreasury = PendingTreasury(nextTreasury, executableAt);
        emit TreasuryChangeProposed(treasury, nextTreasury, executableAt);
    }

    function acceptTreasury() external {
        PendingTreasury memory pending = pendingTreasury;
        if (msg.sender != pending.account || pending.account == address(0)) revert InvalidTreasury();
        if (block.timestamp < pending.executableAt) revert ChangeNotReady();
        address previous = treasury;
        treasury = pending.account;
        delete pendingTreasury;
        emit TreasuryChanged(previous, treasury);
    }

    function cancelTreasuryChange() external onlyRole(FEE_ADMIN_ROLE) {
        address proposed = pendingTreasury.account;
        if (proposed == address(0)) revert InvalidTreasury();
        delete pendingTreasury;
        emit TreasuryChangeCancelled(proposed);
    }

    function depositFee(address token, uint256 amount) external nonReentrant {
        if (token == address(0) || amount == 0) revert InvalidFee();
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        if (IERC20(token).balanceOf(address(this)) - balanceBefore != amount) revert InvalidFee();
        accruedFees[token] += amount;
        emit FeesAccrued(token, amount, accruedFees[token]);
    }

    function withdrawFees(address token, uint256 amount) external nonReentrant {
        if (msg.sender != treasury || amount == 0 || amount > accruedFees[token]) revert InvalidFee();
        accruedFees[token] -= amount;
        IERC20(token).safeTransfer(treasury, amount);
        emit FeesWithdrawn(token, treasury, amount);
    }
}
