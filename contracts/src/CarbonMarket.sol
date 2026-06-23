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
    uint256 public voteThreshold = 3;
    uint256 public challengerPenaltyBps = 1000;
    uint256 public challengerRewardReputation = 10;
    uint256 public challengerPenaltyReputation = 5;
    uint256 public minimumVerifierReputationToApprove = 50;
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
    event ProjectRejected(uint256 indexed projectId, address indexed assessor, uint256 slashedAmount);
    event ReviewerBondUpdated(uint256 newAmount);
    event ChallengeDurationUpdated(uint256 newDuration);
    event VoteThresholdUpdated(uint256 newThreshold);
    event ChallengerPenaltyBpsUpdated(uint256 newBps);
    event ChallengerRewardReputationUpdated(uint256 newPoints);
    event ChallengerPenaltyReputationUpdated(uint256 newPoints);
    event PlatformFeeBpsUpdated(uint256 newBps);
    event MinimumVerifierReputationUpdated(uint256 newPoints);

    error InvalidState();
    error InvalidConfig();
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
        if (amount == 0) revert InvalidConfig();
        reviewerBond = amount;
        emit ReviewerBondUpdated(amount);
    }

    function setChallengeDuration(uint256 durationSeconds) external onlyOwner {
        if (durationSeconds == 0) revert InvalidConfig();
        challengeDuration = durationSeconds;
        emit ChallengeDurationUpdated(durationSeconds);
    }

    function setVoteThreshold(uint256 votes) external onlyOwner {
        if (votes == 0) revert InvalidConfig();
        voteThreshold = votes;
        emit VoteThresholdUpdated(votes);
    }

    function setChallengerPenaltyBps(uint256 bps) external onlyOwner {
        if (bps > 10_000) revert InvalidConfig();
        challengerPenaltyBps = bps;
        emit ChallengerPenaltyBpsUpdated(bps);
    }

    function setChallengerRewardReputation(uint256 points) external onlyOwner {
        challengerRewardReputation = points;
        emit ChallengerRewardReputationUpdated(points);
    }

    function setChallengerPenaltyReputation(uint256 points) external onlyOwner {
        challengerPenaltyReputation = points;
        emit ChallengerPenaltyReputationUpdated(points);
    }

    function setPlatformFeeBps(uint256 bps) external onlyOwner {
        if (bps > 10_000) revert InvalidConfig();
        platformFeeBps = bps;
        emit PlatformFeeBpsUpdated(bps);
    }

    function setMinimumVerifierReputationToApprove(uint256 points) external onlyOwner {
        minimumVerifierReputationToApprove = points;
        emit MinimumVerifierReputationUpdated(points);
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
    ) external {
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
        Project storage project = projects[projectId];
        Challenge storage challenge = challenges[projectId];

        if (project.status != ProjectStatus.Challenged) revert InvalidState();
        if (msg.sender == project.seller) revert Unauthorized();
        if (challenge.finalized) revert ChallengeUnavailable();
        if (hasVotedOnChallenge[projectId][msg.sender]) revert AlreadyVoted();

        hasVotedOnChallenge[projectId][msg.sender] = true;
        if (fraudDetected) {
            challenge.fraudVotes += 1;
        } else {
            challenge.validVotes += 1;
        }

        emit ChallengeVoted(projectId, msg.sender, fraudDetected);

        if (challenge.fraudVotes + challenge.validVotes >= voteThreshold) {
            _resolveChallenge(projectId);
        }
    }

    function _resolveChallenge(uint256 projectId) internal {
        Project storage project = projects[projectId];
        Challenge storage challenge = challenges[projectId];

        challenge.finalized = true;
        bool fraudConfirmed = challenge.fraudVotes > challenge.validVotes;
        uint256 slashedAmount = fraudConfirmed
            ? _applyChallengeUpheld(project, challenge.challenger)
            : _applyChallengeRejected(project, challenge.challenger);

        emit ChallengeFinalized(projectId, fraudConfirmed, slashedAmount);
    }

    function demoResolveChallenge(uint256 projectId, bool upholdChallenge) external {
        Project storage project = projects[projectId];
        Challenge storage challenge = challenges[projectId];

        if (project.status != ProjectStatus.Challenged) revert InvalidState();
        if (challenge.finalized) revert ChallengeUnavailable();

        challenge.finalized = true;
        uint256 slashedAmount = upholdChallenge
            ? _applyChallengeUpheld(project, challenge.challenger)
            : _applyChallengeRejected(project, challenge.challenger);

        emit ChallengeFinalized(projectId, upholdChallenge, slashedAmount);
    }

    function finalizeChallenge(
        uint256 projectId,
        uint256 /* slashBps */,
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
            slashedAmount = project.stakedAmount;
            _applyChallengeUpheld(project, challenge.challenger);
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

        } else {
            _applyChallengeRejected(project, challenge.challenger);
        }

        emit ChallengeFinalized(projectId, fraudConfirmed, slashedAmount);
    }

    function _applyChallengeUpheld(Project storage project, address challenger) internal returns (uint256 slashedAmount) {
        slashedAmount = project.stakedAmount;
        if (slashedAmount > 0) {
            project.stakedAmount = 0;
            utilityToken.transfer(challenger, slashedAmount);
        }

        ReviewerProfile storage reviewer = reviewers[challenger];
        reviewer.reputation += challengerRewardReputation;
        project.status = ProjectStatus.Slashed;
    }

    function _applyChallengeRejected(Project storage project, address challenger) internal returns (uint256 penaltyAmount) {
        ReviewerProfile storage reviewer = reviewers[challenger];
        penaltyAmount = (reviewer.stakedAmount * challengerPenaltyBps) / 10_000;
        if (penaltyAmount > reviewer.stakedAmount) {
            penaltyAmount = reviewer.stakedAmount;
        }
        if (penaltyAmount > 0) {
            reviewer.stakedAmount -= penaltyAmount;
            utilityToken.transfer(treasury, penaltyAmount);
        }

        if (reviewer.reputation > challengerPenaltyReputation) {
            reviewer.reputation -= challengerPenaltyReputation;
        } else {
            reviewer.reputation = 0;
        }

        project.status = ProjectStatus.Minted;
    }

    function rejectProject(uint256 projectId, uint256 slashBps) external {
        Project storage project = projects[projectId];
        if (
            project.status == ProjectStatus.Minted ||
            project.status == ProjectStatus.Slashed ||
            project.status == ProjectStatus.Closed
        ) revert InvalidState();

        uint256 slashedAmount = 0;
        if (project.stakedAmount > 0 && slashBps > 0) {
            slashedAmount = (project.stakedAmount * slashBps) / 10_000;
            if (slashedAmount > 0) {
                project.stakedAmount -= slashedAmount;
                utilityToken.transfer(treasury, slashedAmount);
            }
        }

        // Return remaining stake to seller
        if (project.stakedAmount > 0) {
            uint256 remaining = project.stakedAmount;
            project.stakedAmount = 0;
            utilityToken.transfer(project.seller, remaining);
        }

        project.status = ProjectStatus.Slashed;
        emit ProjectRejected(projectId, msg.sender, slashedAmount);
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
