// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IArcSignalMarketAmm} from "./interfaces/IArcSignalMarketAmm.sol";
import {IProtocolFeeControllerV2} from "./interfaces/IProtocolFeeControllerV2.sol";

contract PredictionMarketAMMV2 is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint16 public constant PROTOCOL_VERSION = 2;
    uint256 public constant BPS = 10_000;
    uint256 public constant MINIMUM_LIQUIDITY = 1_000;
    address private constant DEAD = 0x000000000000000000000000000000000000dEaD;

    IArcSignalMarketAmm public immutable market;
    IERC20 public immutable yesToken;
    IERC20 public immutable noToken;
    IProtocolFeeControllerV2 public immutable feeController;
    address public immutable factory;
    uint16 public immutable protocolFeeBps;
    uint16 public immutable lpFeeBps;
    uint256 public protocolFeesYes;
    uint256 public protocolFeesNo;

    error InvalidConfiguration();
    error InvalidAmount();
    error SlippageExceeded();
    error MarketUnavailable();
    error Unauthorized();

    event LiquidityAdded(
        address indexed provider, address indexed recipient, uint256 yesAmount, uint256 noAmount, uint256 shares
    );
    event LiquidityRemoved(
        address indexed provider, address indexed recipient, uint256 shares, uint256 yesAmount, uint256 noAmount
    );
    event Swap(
        address indexed trader, address indexed tokenIn, uint256 amountIn, uint256 amountOut, uint256 protocolFee
    );
    event ProtocolFeesCollected(address indexed token, uint256 amount);

    constructor(address market_, address feeController_, uint16 protocolFeeBps_, uint16 lpFeeBps_, address factory_)
        ERC20("ArcSignal Market LP", "AS-LP")
    {
        if (
            market_ == address(0) || feeController_ == address(0) || factory_ == address(0)
                || protocolFeeBps_ + lpFeeBps_ >= BPS
        ) {
            revert InvalidConfiguration();
        }
        market = IArcSignalMarketAmm(market_);
        yesToken = IERC20(market.yesToken());
        noToken = IERC20(market.noToken());
        feeController = IProtocolFeeControllerV2(feeController_);
        factory = factory_;
        protocolFeeBps = protocolFeeBps_;
        lpFeeBps = lpFeeBps_;
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function reserves() public view returns (uint256 yesReserve, uint256 noReserve) {
        yesReserve = yesToken.balanceOf(address(this)) - protocolFeesYes;
        noReserve = noToken.balanceOf(address(this)) - protocolFeesNo;
    }

    function seedFromFactory(uint256 amount, address recipient) external nonReentrant returns (uint256 shares) {
        if (msg.sender != factory || totalSupply() != 0 || amount <= MINIMUM_LIQUIDITY) revert Unauthorized();
        _requireOpen();
        market.mintPositionsFor(factory, address(this), amount);
        _mint(DEAD, MINIMUM_LIQUIDITY);
        shares = amount - MINIMUM_LIQUIDITY;
        _mint(recipient, shares);
        emit LiquidityAdded(factory, recipient, amount, amount, shares);
    }

    function addLiquidity(uint256 yesAmount, uint256 noAmount, uint256 minShares, address recipient)
        external
        nonReentrant
        returns (uint256 shares)
    {
        _requireOpen();
        if (yesAmount == 0 || noAmount == 0 || recipient == address(0)) revert InvalidAmount();
        (uint256 yesReserve, uint256 noReserve) = reserves();
        uint256 supply = totalSupply();
        if (supply == 0) {
            uint256 root = Math.sqrt(yesAmount * noAmount);
            if (root <= MINIMUM_LIQUIDITY) revert InvalidAmount();
            _mint(DEAD, MINIMUM_LIQUIDITY);
            shares = root - MINIMUM_LIQUIDITY;
        } else {
            shares = Math.min(Math.mulDiv(yesAmount, supply, yesReserve), Math.mulDiv(noAmount, supply, noReserve));
        }
        if (shares < minShares || shares == 0) revert SlippageExceeded();
        yesToken.safeTransferFrom(msg.sender, address(this), yesAmount);
        noToken.safeTransferFrom(msg.sender, address(this), noAmount);
        _mint(recipient, shares);
        emit LiquidityAdded(msg.sender, recipient, yesAmount, noAmount, shares);
    }

    function removeLiquidity(uint256 shares, uint256 minYes, uint256 minNo, address recipient)
        external
        nonReentrant
        returns (uint256 yesAmount, uint256 noAmount)
    {
        if (shares == 0 || recipient == address(0)) revert InvalidAmount();
        (uint256 yesReserve, uint256 noReserve) = reserves();
        uint256 supply = totalSupply();
        yesAmount = Math.mulDiv(shares, yesReserve, supply);
        noAmount = Math.mulDiv(shares, noReserve, supply);
        if (yesAmount < minYes || noAmount < minNo || yesAmount == 0 || noAmount == 0) revert SlippageExceeded();
        _burn(msg.sender, shares);
        yesToken.safeTransfer(recipient, yesAmount);
        noToken.safeTransfer(recipient, noAmount);
        emit LiquidityRemoved(msg.sender, recipient, shares, yesAmount, noAmount);
    }

    function swapExactYesForNo(uint256 amountIn, uint256 minAmountOut, address recipient)
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        amountOut = _swap(true, amountIn, minAmountOut, recipient);
    }

    function swapExactNoForYes(uint256 amountIn, uint256 minAmountOut, address recipient)
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        amountOut = _swap(false, amountIn, minAmountOut, recipient);
    }

    function quoteExactInput(bool yesForNo, uint256 amountIn) external view returns (uint256 amountOut) {
        (uint256 yesReserve, uint256 noReserve) = reserves();
        (uint256 reserveIn, uint256 reserveOut) = yesForNo ? (yesReserve, noReserve) : (noReserve, yesReserve);
        uint256 effectiveInput = Math.mulDiv(amountIn, BPS - protocolFeeBps - lpFeeBps, BPS);
        if (reserveIn == 0 || reserveOut == 0) return 0;
        return Math.mulDiv(reserveOut, effectiveInput, reserveIn + effectiveInput);
    }

    function collectProtocolFees() external nonReentrant {
        _collect(yesToken, true);
        _collect(noToken, false);
    }

    function _swap(bool yesForNo, uint256 amountIn, uint256 minAmountOut, address recipient)
        private
        returns (uint256 amountOut)
    {
        _requireOpen();
        if (amountIn == 0 || recipient == address(0)) revert InvalidAmount();
        (uint256 yesReserve, uint256 noReserve) = reserves();
        (uint256 reserveIn, uint256 reserveOut) = yesForNo ? (yesReserve, noReserve) : (noReserve, yesReserve);
        uint256 protocolFee = Math.mulDiv(amountIn, protocolFeeBps, BPS);
        uint256 effectiveInput = Math.mulDiv(amountIn, BPS - protocolFeeBps - lpFeeBps, BPS);
        amountOut = Math.mulDiv(reserveOut, effectiveInput, reserveIn + effectiveInput);
        if (amountOut < minAmountOut || amountOut == 0 || amountOut >= reserveOut) revert SlippageExceeded();
        IERC20 tokenIn = yesForNo ? yesToken : noToken;
        IERC20 tokenOut = yesForNo ? noToken : yesToken;
        tokenIn.safeTransferFrom(msg.sender, address(this), amountIn);
        tokenOut.safeTransfer(recipient, amountOut);
        if (yesForNo) protocolFeesYes += protocolFee;
        else protocolFeesNo += protocolFee;
        emit Swap(msg.sender, address(tokenIn), amountIn, amountOut, protocolFee);
    }

    function _collect(IERC20 token, bool yes) private {
        uint256 amount = yes ? protocolFeesYes : protocolFeesNo;
        if (amount == 0) return;
        if (yes) protocolFeesYes = 0;
        else protocolFeesNo = 0;
        token.forceApprove(address(feeController), amount);
        feeController.depositFee(address(token), amount);
        emit ProtocolFeesCollected(address(token), amount);
    }

    function _requireOpen() private view {
        if (!market.marketStateIsOpen() || market.exposurePaused()) revert MarketUnavailable();
    }
}
