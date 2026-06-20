// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "./CarbonCreditToken.sol";
import "./RetireCertificate.sol";

contract CarbonMarket is Ownable, ERC1155Holder {
    enum ProjectStatus {
        Pending,
        Assessed,
        Staked,
        Minted,
        Challenged,
        Slashed,
        Closed
    }

    struct Project {
        uint256 id;
        address seller;
        string metadataUri;
        string sourceDataHash;
        uint256 requestedCredits;
        uint256 approvedCredits;
        uint256 vintageYear;
        uint256 riskScore;
        uint256 trustScore;
        uint256 requiredStake;
        uint256 stakedAmount;
        uint256 availableCredits;
        uint256 pricePerCredit;
        ProjectStatus status;
    }

    struct ReviewerProfile {
        uint256 stakedAmount;
        uint256 reputation;
        bool active;
    }

    struct Challenge {
        address challenger;
        uint256 challengerBond;
        uint256 fraudVotes;
        uint256 validVotes;
        uint256 deadline;
        bool finalized;
    }

    IERC20 public immutable utilityToken;
    CarbonCreditToken public immutable carbonToken;
    RetireCertificate public retireCertificate;

    uint256 public nextProjectId = 1;
    uint256 public reviewerBond = 100 ether;
    uint256 public challengeDuration = 3 days;
    uint256 public reviewQuorum = 2;
    uint256 public platformFeeBps = 200;
    address public treasury;
    address public assessor;

    mapping(uint256 => Project) public projects;
    mapping(address => ReviewerProfile) public reviewers;
    mapping(uint256 => Challenge) public challenges;
    mapping(uint256 => mapping(address => bool)) public hasVotedOnChallenge;

    event ProjectSubmitted(uint256 indexed projectId, address indexed seller, uint256 requestedCredits);
    event ProjectAssessed(uint256 indexed projectId, uint256 approvedCredits, uint256 riskScore, uint256 requiredStake);
    event StakeDeposited(uint256 indexed projectId, address indexed seller, uint256 amount);
    event CreditsMinted(uint256 indexed projectId, uint256 amount, uint256 pricePerCredit);
    event CreditsPurchased(uint256 indexed projectId, address indexed buyer, uint256 amount, uint256 totalCost);
    event CreditsRetired(uint256 indexed projectId, address indexed retiree, uint256 amount, uint256 certTokenId);
    event ReviewerRegistered(address indexed reviewer, uint256 amount);
    event ChallengeOpened(uint256 indexed projectId, address indexed challenger, uint256 deadline);
    event ChallengeVoted(uint256 indexed projectId, address indexed reviewer, bool fraudDetected);
    event ChallengeFinalized(uint256 indexed projectId, bool fraudConfirmed, uint256 slashedAmount);
    event RewardIssued(uint256 indexed projectId, uint256 rewardAmount, uint256 updatedTrustScore);

    error InvalidState();
    error Unauthorized();
    error InsufficientStake();
    error ChallengeUnavailable();
    error AlreadyVoted();
    error QuorumNotReached();
    error ChallengeClosed();
    error ChallengeNotClosed();
    error InsufficientInventory();

    constructor(
        address initialOwner,
        address assessorAddress,
        address treasuryAddress,
        IERC20 utilityTokenAddress,
        CarbonCreditToken carbonTokenAddress
    ) Ownable(initialOwner) {
        assessor = assessorAddress;
        treasury = treasuryAddress;
        utilityToken = utilityTokenAddress;
        carbonToken = carbonTokenAddress;
    }

    modifier onlyAssessor() {
        if (msg.sender != assessor) revert Unauthorized();
        _;
    }

    function setRetireCertificate(address retireCertAddress) external onlyOwner {
        retireCertificate = RetireCertificate(retireCertAddress);
    }

    function setAssessor(address assessorAddress) external onlyOwner {
        assessor = assessorAddress;
    }

    function setTreasury(address treasuryAddress) external onlyOwner {
        treasury = treasuryAddress;
    }

    function setReviewerBond(uint256 amount) external onlyOwner {
        reviewerBond = amount;
    }

    function submitProject(
        string calldata metadataUri,
        string calldata sourceDataHash,
        uint256 requestedCredits,
        uint256 vintageYear
    ) external returns (uint256 projectId) {
        projectId = nextProjectId++;
        projects[projectId] = Project({
            id: projectId,
            seller: msg.sender,
            metadataUri: metadataUri,
            sourceDataHash: sourceDataHash,
            requestedCredits: requestedCredits,
            approvedCredits: 0,
            vintageYear: vintageYear,
            riskScore: 0,
            trustScore: 50,
            requiredStake: 0,
            stakedAmount: 0,
            availableCredits: 0,
            pricePerCredit: 0,
            status: ProjectStatus.Pending
        });

        emit ProjectSubmitted(projectId, msg.sender, requestedCredits);
    }

    function assessProject(
        uint256 projectId,
        uint256 approvedCredits,
        uint256 riskScore,
        uint256 trustScore,
        uint256 requiredStake
    ) external onlyAssessor {
        Project storage project = projects[projectId];
        if (project.status != ProjectStatus.Pending) revert InvalidState();

        project.approvedCredits = approvedCredits;
        project.riskScore = riskScore;
        project.trustScore = trustScore;
        project.requiredStake = requiredStake;
        project.status = ProjectStatus.Assessed;

        emit ProjectAssessed(projectId, approvedCredits, riskScore, requiredStake);
    }

    function depositProjectStake(uint256 projectId, uint256 amount) external {
        Project storage project = projects[projectId];
        if (msg.sender != project.seller) revert Unauthorized();
        if (project.status != ProjectStatus.Assessed && project.status != ProjectStatus.Staked) revert InvalidState();

        utilityToken.transferFrom(msg.sender, address(this), amount);
        project.stakedAmount += amount;

        if (project.stakedAmount >= project.requiredStake) {
            project.status = ProjectStatus.Staked;
        }

        emit StakeDeposited(projectId, msg.sender, amount);
    }

    function mintAndListCredits(
        uint256 projectId,
        uint256 pricePerCredit,
        string calldata tokenUri
    ) external {
        Project storage project = projects[projectId];
        if (msg.sender != project.seller) revert Unauthorized();
        if (project.status != ProjectStatus.Staked) revert InvalidState();
        if (project.stakedAmount < project.requiredStake) revert InsufficientStake();

        project.pricePerCredit = pricePerCredit;
        project.availableCredits = project.approvedCredits;
        project.status = ProjectStatus.Minted;

        carbonToken.mint(address(this), projectId, project.approvedCredits, tokenUri);

        emit CreditsMinted(projectId, project.approvedCredits, pricePerCredit);
    }

    function buyCredits(uint256 projectId, uint256 amount) external {
        Project storage project = projects[projectId];
        if (project.status != ProjectStatus.Minted) revert InvalidState();
        if (project.availableCredits < amount) revert InsufficientInventory();

        uint256 totalCost = amount * project.pricePerCredit;
        uint256 fee = (totalCost * platformFeeBps) / 10_000;
        uint256 sellerAmount = totalCost - fee;

        utilityToken.transferFrom(msg.sender, treasury, fee);
        utilityToken.transferFrom(msg.sender, project.seller, sellerAmount);

        project.availableCredits -= amount;
        carbonToken.safeTransferFrom(address(this), msg.sender, projectId, amount, "");

        emit CreditsPurchased(projectId, msg.sender, amount, totalCost);
    }

    function registerReviewer() external {
        ReviewerProfile storage reviewer = reviewers[msg.sender];
        if (!reviewer.active) {
            reviewer.active = true;
            reviewer.reputation = 50;
        }

        utilityToken.transferFrom(msg.sender, address(this), reviewerBond);
        reviewer.stakedAmount += reviewerBond;

        emit ReviewerRegistered(msg.sender, reviewerBond);
    }

    function openChallenge(uint256 projectId) external {
        Project storage project = projects[projectId];
        ReviewerProfile storage reviewer = reviewers[msg.sender];
        Challenge storage challenge = challenges[projectId];

        if (!reviewer.active || reviewer.stakedAmount < reviewerBond) revert Unauthorized();
        if (project.status != ProjectStatus.Minted) revert ChallengeUnavailable();
        if (challenge.deadline != 0 && !challenge.finalized) revert ChallengeUnavailable();

        project.status = ProjectStatus.Challenged;
        challenges[projectId] = Challenge({
            challenger: msg.sender,
            challengerBond: reviewerBond,
            fraudVotes: 0,
            validVotes: 0,
            deadline: block.timestamp + challengeDuration,
            finalized: false
        });

        emit ChallengeOpened(projectId, msg.sender, block.timestamp + challengeDuration);
    }

    function voteOnChallenge(uint256 projectId, bool fraudDetected) external {
        ReviewerProfile storage reviewer = reviewers[msg.sender];
        Challenge storage challenge = challenges[projectId];

        if (!reviewer.active) revert Unauthorized();
        if (challenge.deadline == 0 || challenge.finalized) revert ChallengeUnavailable();
        if (block.timestamp > challenge.deadline) revert ChallengeClosed();
        if (hasVotedOnChallenge[projectId][msg.sender]) revert AlreadyVoted();

        hasVotedOnChallenge[projectId][msg.sender] = true;
        if (fraudDetected) {
            challenge.fraudVotes += 1;
        } else {
            challenge.validVotes += 1;
        }

        emit ChallengeVoted(projectId, msg.sender, fraudDetected);
    }

    function finalizeChallenge(
        uint256 projectId,
        uint256 slashBps,
        uint256 burnAmount,
        uint256 trustPenalty
    ) external {
        Project storage project = projects[projectId];
        Challenge storage challenge = challenges[projectId];

        if (challenge.deadline == 0 || challenge.finalized) revert ChallengeUnavailable();
        if (block.timestamp < challenge.deadline) revert ChallengeNotClosed();
        if (challenge.fraudVotes + challenge.validVotes < reviewQuorum) revert QuorumNotReached();

        challenge.finalized = true;
        bool fraudConfirmed = challenge.fraudVotes > challenge.validVotes;
        uint256 slashedAmount = 0;

        if (fraudConfirmed) {
            slashedAmount = (project.stakedAmount * slashBps) / 10_000;
            if (slashedAmount > 0) {
                project.stakedAmount -= slashedAmount;
                utilityToken.transfer(challenge.challenger, slashedAmount / 2);
                utilityToken.transfer(treasury, slashedAmount - (slashedAmount / 2));
            }

            if (trustPenalty > project.trustScore) {
                project.trustScore = 0;
            } else {
                project.trustScore -= trustPenalty;
            }

            if (burnAmount > 0) {
                carbonToken.burn(address(this), projectId, burnAmount);
                if (burnAmount >= project.availableCredits) {
                    project.availableCredits = 0;
                } else {
                    project.availableCredits -= burnAmount;
                }
            }

            project.status = ProjectStatus.Slashed;
        } else {
            project.status = ProjectStatus.Minted;
            reviewers[challenge.challenger].reputation = reviewers[challenge.challenger].reputation > 5
                ? reviewers[challenge.challenger].reputation - 5
                : 0;
        }

        emit ChallengeFinalized(projectId, fraudConfirmed, slashedAmount);
    }

    function rewardHonestProject(uint256 projectId, uint256 rewardAmount, uint256 trustBoost) external onlyAssessor {
        Project storage project = projects[projectId];
        if (project.status != ProjectStatus.Minted) revert InvalidState();

        utilityToken.transfer(project.seller, rewardAmount);
        project.trustScore += trustBoost;

        emit RewardIssued(projectId, rewardAmount, project.trustScore);
    }

    function retireCredits(
        uint256 projectId,
        uint256 amount,
        string calldata certTokenUri
    ) external returns (uint256 certTokenId) {
        if (address(retireCertificate) == address(0)) revert InvalidState();
        if (carbonToken.balanceOf(msg.sender, projectId) < amount) revert InsufficientInventory();

        carbonToken.burn(msg.sender, projectId, amount);
        certTokenId = retireCertificate.mintCertificate(msg.sender, projectId, amount, certTokenUri);

        emit CreditsRetired(projectId, msg.sender, amount, certTokenId);
    }
}
