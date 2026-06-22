// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * TCUTSale — two ways to get TCUT:
 *  1. claimFaucet()  — free 10,000 TCUT once per 24 hours
 *  2. buyTokens()    — pay ETH at a fixed rate (default 10,000,000 TCUT/ETH)
 *
 * rate formula: amount = msg.value * rate
 *   rate = 10_000_000 → 1 ETH = 10,000,000 TCUT; 0.001 ETH = 10,000 TCUT
 */
contract TCUTSale is Ownable {
    IERC20 public immutable token;
    uint256 public rate;
    uint256 public faucetAmount;
    uint256 public faucetCooldown;

    mapping(address => uint256) public lastClaim;

    event TokensPurchased(address indexed buyer, uint256 ethPaid, uint256 tcutReceived);
    event FaucetClaimed(address indexed claimant, uint256 amount);
    event RateUpdated(uint256 newRate);
    event FaucetConfigUpdated(uint256 amount, uint256 cooldown);

    error ZeroPayment();
    error InsufficientInventory();
    error FaucetCooldownActive(uint256 availableAt);

    constructor(
        address tokenAddress,
        uint256 initialRate,
        uint256 initialFaucetAmount,
        uint256 initialFaucetCooldown
    ) Ownable(msg.sender) {
        token = IERC20(tokenAddress);
        rate = initialRate;
        faucetAmount = initialFaucetAmount;
        faucetCooldown = initialFaucetCooldown;
    }

    // ── Faucet ────────────────────────────────────────────────────────────
    function claimFaucet() external {
        uint256 available = lastClaim[msg.sender] + faucetCooldown;
        if (block.timestamp < available) revert FaucetCooldownActive(available);
        if (token.balanceOf(address(this)) < faucetAmount) revert InsufficientInventory();
        lastClaim[msg.sender] = block.timestamp;
        token.transfer(msg.sender, faucetAmount);
        emit FaucetClaimed(msg.sender, faucetAmount);
    }

    function timeUntilNextClaim(address user) external view returns (uint256) {
        uint256 available = lastClaim[user] + faucetCooldown;
        if (block.timestamp >= available) return 0;
        return available - block.timestamp;
    }

    // ── Buy with ETH ──────────────────────────────────────────────────────
    function buyTokens() external payable {
        if (msg.value == 0) revert ZeroPayment();
        uint256 amount = msg.value * rate;
        if (token.balanceOf(address(this)) < amount) revert InsufficientInventory();
        token.transfer(msg.sender, amount);
        emit TokensPurchased(msg.sender, msg.value, amount);
    }

    // ── Owner controls ────────────────────────────────────────────────────
    function setRate(uint256 newRate) external onlyOwner {
        rate = newRate;
        emit RateUpdated(newRate);
    }

    function setFaucetConfig(uint256 amount, uint256 cooldown) external onlyOwner {
        faucetAmount = amount;
        faucetCooldown = cooldown;
        emit FaucetConfigUpdated(amount, cooldown);
    }

    function withdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function withdrawTokens(uint256 amount) external onlyOwner {
        token.transfer(owner(), amount);
    }

    function tokenBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
