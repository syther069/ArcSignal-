// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Test} from "forge-std/Test.sol";
import {SignalAnchor} from "../src/contracts/v2/SignalAnchor.sol";

contract SignalAnchorTest is Test {
    SignalAnchor internal anchorContract;
    address internal anchorer = address(0xA11CE);

    event SignalBatchAnchored(bytes32 indexed root, bytes32 indexed batchId, uint32 count, uint64 timestamp);

    function setUp() public {
        anchorContract = new SignalAnchor(anchorer);
    }

    function testAnchorRecordsTimestampAndEmits() public {
        vm.warp(1_800_000_000);
        vm.expectEmit(true, true, false, true);
        emit SignalBatchAnchored(bytes32(uint256(1)), bytes32(uint256(7)), 3, 1_800_000_000);
        vm.prank(anchorer);
        anchorContract.anchor(bytes32(uint256(1)), 3, bytes32(uint256(7)));
        assertEq(anchorContract.anchoredAt(bytes32(uint256(1))), 1_800_000_000);
    }

    function testOnlyAnchorerCanAnchor() public {
        vm.expectRevert(SignalAnchor.Unauthorized.selector);
        anchorContract.anchor(bytes32(uint256(1)), 1, bytes32(0));
    }

    function testRejectsEmptyAndDuplicateBatches() public {
        vm.startPrank(anchorer);
        vm.expectRevert(SignalAnchor.InvalidBatch.selector);
        anchorContract.anchor(bytes32(0), 1, bytes32(0));
        vm.expectRevert(SignalAnchor.InvalidBatch.selector);
        anchorContract.anchor(bytes32(uint256(1)), 0, bytes32(0));
        anchorContract.anchor(bytes32(uint256(1)), 1, bytes32(0));
        vm.expectRevert(SignalAnchor.AlreadyAnchored.selector);
        anchorContract.anchor(bytes32(uint256(1)), 1, bytes32(0));
        vm.stopPrank();
    }

    function testZeroAnchorerRejected() public {
        vm.expectRevert(SignalAnchor.InvalidBatch.selector);
        new SignalAnchor(address(0));
    }
}
