// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract OutcomeTokenV2 is ERC20 {
    address public immutable market;
    uint8 private immutable _tokenDecimals;

    error OnlyMarket();
    error InvalidMarket();

    constructor(string memory name_, string memory symbol_, uint8 decimals_, address market_) ERC20(name_, symbol_) {
        if (market_ == address(0)) revert InvalidMarket();
        market = market_;
        _tokenDecimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _tokenDecimals;
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != market) revert OnlyMarket();
        _mint(to, amount);
    }

    function burnFromMarket(address from, uint256 amount) external {
        if (msg.sender != market) revert OnlyMarket();
        _burn(from, amount);
    }
}
