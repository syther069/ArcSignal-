// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ARCSignal} from "../src/contracts/ArcSignal.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}

contract ArcSignalTest is Test {
    MockUSDC private usdc;
    ARCSignal private signal;
    address private alice = makeAddr("alice");
    address private bob = makeAddr("bob");
    uint256 private resolutionTime;

    function setUp() public {
        usdc = new MockUSDC();
        signal = new ARCSignal(address(usdc));
        resolutionTime = block.timestamp + 1 hours;
        usdc.mint(alice, 1_000e6);
        usdc.mint(bob, 1_000e6);
        vm.prank(alice);
        usdc.approve(address(signal), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(signal), type(uint256).max);
    }

    function testWinnerClaimsExactParimutuelPayout() public {
        _createMarket("market-1");
        vm.prank(alice);
        signal.stake("market-1", 0, 100e6);
        vm.prank(bob);
        signal.stake("market-1", 1, 50e6);

        vm.warp(resolutionTime);
        signal.resolveMarket("market-1", 1);
        vm.prank(alice);
        signal.claimWinnings("market-1");

        assertEq(usdc.balanceOf(alice), 1_050e6);
        assertTrue(signal.claimed("market-1", alice));
    }

    function testCancelledMarketRefundsBothSidesExactlyOnce() public {
        _createMarket("market-2");
        vm.startPrank(alice);
        signal.stake("market-2", 0, 100e6);
        signal.stake("market-2", 1, 20e6);
        vm.stopPrank();

        signal.cancelMarket("market-2");
        vm.prank(alice);
        signal.claimWinnings("market-2");

        assertEq(usdc.balanceOf(alice), 1_000e6);
        vm.expectRevert("Already claimed");
        vm.prank(alice);
        signal.claimWinnings("market-2");
    }

    function testCannotResolveEarlyOrToAnEmptyPool() public {
        _createMarket("market-3");
        vm.prank(alice);
        signal.stake("market-3", 0, 100e6);

        vm.expectRevert("Resolution too early");
        signal.resolveMarket("market-3", 1);
        vm.warp(resolutionTime);
        vm.expectRevert("Winning pool is empty");
        signal.resolveMarket("market-3", 2);
    }

    function testPauseStopsNewRiskButNotRefunds() public {
        _createMarket("market-4");
        vm.prank(alice);
        signal.stake("market-4", 0, 100e6);
        signal.cancelMarket("market-4");
        signal.pause();

        vm.prank(alice);
        signal.claimWinnings("market-4");
        assertEq(usdc.balanceOf(alice), 1_000e6);
    }

    function _createMarket(string memory marketId) private {
        signal.createMarket(marketId, "CRYPTO", "Will the condition be true?", "{}", resolutionTime);
    }
}
