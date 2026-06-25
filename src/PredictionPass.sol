// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PredictionPass is ERC721, Ownable {
    uint256 private _nextTokenId;
    mapping(address => bool) public hasMinted;

    event PassMinted(address indexed user, uint256 indexed tokenId);

    constructor() ERC721("ArcSignal Prediction Pass", "MMPASS") Ownable(msg.sender) {}

    function mint() external returns (uint256) {
        require(!hasMinted[msg.sender], "Already minted a pass");
        
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;
        
        hasMinted[msg.sender] = true;
        _safeMint(msg.sender, tokenId);
        
        emit PassMinted(msg.sender, tokenId);
        return tokenId;
    }
    
    function hasPass(address user) external view returns (bool) {
        return hasMinted[user] || balanceOf(user) > 0;
    }
}
