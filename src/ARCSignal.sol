// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ARCSignal is Ownable {
    IERC20 public usdc; // USDC token on ARC Testnet

    struct Market {
        string marketId;
        string category;
        uint256 resolutionTime;
        uint256 followPool;
        uint256 fadePool;
        bool resolved;
        uint8 outcome; // 0 = Follow wins, 1 = Fade wins
    }

    mapping(string => Market) public markets;
    mapping(string => mapping(address => uint256)) public followStakes;
    mapping(string => mapping(address => uint256)) public fadeStakes;
    mapping(string => mapping(address => bool)) public claimed;

    event MarketCreated(string marketId, string category, uint256 resolutionTime);
    event Staked(string marketId, address user, uint8 side, uint256 amount);
    event MarketResolved(string marketId, uint8 outcome);
    event Claimed(string marketId, address user, uint256 amount);

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    function createMarket(string memory marketId, string memory category, uint256 resolutionTime) external onlyOwner {
        markets[marketId] = Market(marketId, category, resolutionTime, 0, 0, false, 0);
        emit MarketCreated(marketId, category, resolutionTime);
    }

    // side: 0 = Follow, 1 = Fade
    // amount in USDC (6 decimals)
    function stake(string memory marketId, uint8 side, uint256 amount) external {
        require(!markets[marketId].resolved, "Market resolved");
        require(block.timestamp < markets[marketId].resolutionTime, "Market closed");
        require(amount > 0, "Amount must be > 0");

        usdc.transferFrom(msg.sender, address(this), amount);

        if (side == 0) {
            markets[marketId].followPool += amount;
            followStakes[marketId][msg.sender] += amount;
        } else {
            markets[marketId].fadePool += amount;
            fadeStakes[marketId][msg.sender] += amount;
        }

        emit Staked(marketId, msg.sender, side, amount);
    }

    function resolveMarket(string memory marketId, uint8 outcome) external onlyOwner {
        require(!markets[marketId].resolved, "Already resolved");
        markets[marketId].resolved = true;
        markets[marketId].outcome = outcome;
        emit MarketResolved(marketId, outcome);
    }

    function claimWinnings(string memory marketId) external {
        Market memory m = markets[marketId];
        require(m.resolved, "Not resolved");
        require(!claimed[marketId][msg.sender], "Already claimed");

        uint256 userStake;
        uint256 winningPool;
        uint256 totalPool = m.followPool + m.fadePool;

        if (m.outcome == 0) {
            userStake = followStakes[marketId][msg.sender];
            winningPool = m.followPool;
        } else {
            userStake = fadeStakes[marketId][msg.sender];
            winningPool = m.fadePool;
        }

        require(userStake > 0, "No winning stake");
        uint256 payout = (userStake * totalPool) / winningPool;
        claimed[marketId][msg.sender] = true;
        usdc.transfer(msg.sender, payout);
        emit Claimed(marketId, msg.sender, payout);
    }

    function getMarket(string memory marketId) external view returns (Market memory) {
        return markets[marketId];
    }
}
