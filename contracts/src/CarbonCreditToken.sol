// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CarbonCreditToken is ERC1155, Ownable {
    mapping(uint256 => string) private _uris;
    address public market;

    error Unauthorized();

    constructor(address initialOwner) ERC1155("") Ownable(initialOwner) {}

    modifier onlyMarket() {
        if (msg.sender != market) revert Unauthorized();
        _;
    }

    function setMarket(address marketAddress) external onlyOwner {
        market = marketAddress;
    }

    function mint(address to, uint256 id, uint256 amount, string calldata tokenUri) external onlyMarket {
        _uris[id] = tokenUri;
        _mint(to, id, amount, "");
    }

    function burn(address from, uint256 id, uint256 amount) external onlyMarket {
        _burn(from, id, amount);
    }

    function uri(uint256 id) public view override returns (string memory) {
        return _uris[id];
    }
}
