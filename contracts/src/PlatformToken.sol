// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PlatformToken is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Thai Carbon Utility Token", "TCUT") Ownable(initialOwner) {
        _mint(initialOwner, 10_000_000 ether);
    }

    function faucet(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
