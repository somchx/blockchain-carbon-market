// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RetireCertificate is ERC721, Ownable {
    struct CertData {
        uint256 projectId;
        address retiree;
        uint256 creditsRetired;
        uint256 retiredAt;
        string tokenUri;
    }

    address public market;
    uint256 public nextTokenId = 1;

    mapping(uint256 => CertData) public certs;

    event CertificateMinted(
        uint256 indexed tokenId,
        uint256 indexed projectId,
        address indexed retiree,
        uint256 creditsRetired
    );

    error Unauthorized();

    constructor(address initialOwner) ERC721("Carbon Retirement Certificate", "CRC") Ownable(initialOwner) {}

    modifier onlyMarket() {
        if (msg.sender != market) revert Unauthorized();
        _;
    }

    function setMarket(address marketAddress) external onlyOwner {
        market = marketAddress;
    }

    function mintCertificate(
        address retiree,
        uint256 projectId,
        uint256 creditsRetired,
        string calldata tokenUri
    ) external onlyMarket returns (uint256 tokenId) {
        tokenId = nextTokenId++;
        certs[tokenId] = CertData({
            projectId: projectId,
            retiree: retiree,
            creditsRetired: creditsRetired,
            retiredAt: block.timestamp,
            tokenUri: tokenUri
        });
        _safeMint(retiree, tokenId);
        emit CertificateMinted(tokenId, projectId, retiree, creditsRetired);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return certs[tokenId].tokenUri;
    }
}
