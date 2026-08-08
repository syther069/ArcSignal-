// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ARCSignal is Ownable {
    IERC20 public usdc;

    struct Market {
        string marketId;
        string category;
        string question;
        string analysisJson;
        uint256 resolutionTime;
        uint256 followPool;
        uint256 fadePool;
        bool resolved;
        uint8 outcome; // 0 = unresolved, 1 = follow wins, 2 = fade wins
    }

    mapping(string => Market) public markets;
    string[] public marketIds;
    mapping(string => mapping(address => uint256)) public followStakes;
    mapping(string => mapping(address => uint256)) public fadeStakes;
    mapping(string => mapping(address => bool)) public claimed;

    struct UserProfile {
        string username;
        string bio;
        string avatarUrl;
    }
    mapping(address => UserProfile) public profiles;
    mapping(string => address) public usernameToAddress;

    event MarketCreated(string marketId, string category, string question, uint256 resolutionTime);
    event Staked(string marketId, address user, uint8 side, uint256 amount);
    event MarketResolved(string marketId, uint8 outcome);
    event Claimed(string marketId, address user, uint256 amount);
    event ProfileUpdated(address indexed user, string username, string bio, string avatarUrl);

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    function createMarket(
        string calldata marketId,
        string calldata category,
        string calldata question,
        string calldata analysisJson,
        uint256 resolutionTime
    ) external onlyOwner {
        require(bytes(markets[marketId].marketId).length == 0, "Market already exists");
        markets[marketId] = Market({
            marketId: marketId,
            category: category,
            question: question,
            analysisJson: analysisJson,
            resolutionTime: resolutionTime,
            followPool: 0,
            fadePool: 0,
            resolved: false,
            outcome: 0
        });
        marketIds.push(marketId);
        emit MarketCreated(marketId, category, question, resolutionTime);
    }

    function stake(string calldata marketId, uint8 side, uint256 amount) external {
        Market storage m = markets[marketId];
        require(bytes(m.marketId).length > 0, "Market does not exist");
        require(!m.resolved, "Market already resolved");
        require(block.timestamp < m.resolutionTime, "Market expired");
        require(side == 0 || side == 1, "Invalid side");
        require(amount > 0, "Amount must be > 0");

        usdc.transferFrom(msg.sender, address(this), amount);

        if (side == 0) {
            followStakes[marketId][msg.sender] += amount;
            m.followPool += amount;
        } else {
            fadeStakes[marketId][msg.sender] += amount;
            m.fadePool += amount;
        }

        emit Staked(marketId, msg.sender, side, amount);
    }

    function resolveMarket(string calldata marketId, uint8 outcome) external onlyOwner {
        Market storage m = markets[marketId];
        require(bytes(m.marketId).length > 0, "Market does not exist");
        require(!m.resolved, "Already resolved");
        require(outcome == 1 || outcome == 2, "Invalid outcome");
        m.resolved = true;
        m.outcome = outcome;
        emit MarketResolved(marketId, outcome);
    }

    function cancelMarket(string calldata marketId) external onlyOwner {
        Market storage m = markets[marketId];
        require(bytes(m.marketId).length > 0, "Market does not exist");
        require(!m.resolved, "Already resolved");
        m.resolved = true;
        m.outcome = 0; // cancelled
    }

    function claimWinnings(string calldata marketId) external {
        Market storage m = markets[marketId];
        require(m.resolved, "Not resolved");
        require(!claimed[marketId][msg.sender], "Already claimed");
        require(m.outcome == 1 || m.outcome == 2, "Market cancelled");

        uint256 userStake;
        uint256 winPool;
        uint256 losePool;

        if (m.outcome == 1) {
            userStake = followStakes[marketId][msg.sender];
            winPool = m.followPool;
            losePool = m.fadePool;
        } else {
            userStake = fadeStakes[marketId][msg.sender];
            winPool = m.fadePool;
            losePool = m.followPool;
        }

        require(userStake > 0, "No winning stake");
        claimed[marketId][msg.sender] = true;

        uint256 payout = userStake + (userStake * losePool) / winPool;
        usdc.transfer(msg.sender, payout);

        emit Claimed(marketId, msg.sender, payout);
    }

    function getMarket(string calldata marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    function getMarketCount() external view returns (uint256) {
        return marketIds.length;
    }

    function getMarketIdByIndex(uint256 index) external view returns (string memory) {
        return marketIds[index];
    }

    function getAllMarketIds() external view returns (string[] memory) {
        return marketIds;
    }

    function setProfile(string calldata username, string calldata bio, string calldata avatarUrl) external {
        string memory oldUsername = profiles[msg.sender].username;
        if (bytes(oldUsername).length > 0) {
            delete usernameToAddress[oldUsername];
        }
        
        if (bytes(username).length > 0) {
            require(usernameToAddress[username] == address(0) || usernameToAddress[username] == msg.sender, "Username taken");
            usernameToAddress[username] = msg.sender;
        }
        
        profiles[msg.sender] = UserProfile(username, bio, avatarUrl);
        emit ProfileUpdated(msg.sender, username, bio, avatarUrl);
    }

    function getAddressByUsername(string calldata username) external view returns (address) {
        return usernameToAddress[username];
    }
    
    function getProfile(address user) external view returns (UserProfile memory) {
        return profiles[user];
    }
}
