export const carbonMarketAbi = [
  "function assessor() view returns (address)",
  "function treasury() view returns (address)",
  "function utilityToken() view returns (address)",
  "function carbonToken() view returns (address)",
  "function nextProjectId() view returns (uint256)",
  "function submitProject(string metadataUri, string sourceDataHash, uint256 requestedCredits, uint256 vintageYear) returns (uint256)",
  "function assessProject(uint256 projectId, uint256 approvedCredits, uint256 riskScore, uint256 trustScore, uint256 requiredStake)",
  "function depositProjectStake(uint256 projectId, uint256 amount)",
  "function mintAndListCredits(uint256 projectId, uint256 pricePerCredit, string tokenUri)",
  "function buyCredits(uint256 projectId, uint256 amount)",
  "function retireCredits(uint256 projectId, uint256 amount, string certTokenUri) returns (uint256)",
  "function projects(uint256) view returns (uint256 id, address seller, string metadataUri, string sourceDataHash, uint256 requestedCredits, uint256 approvedCredits, uint256 vintageYear, uint256 riskScore, uint256 trustScore, uint256 requiredStake, uint256 stakedAmount, uint256 availableCredits, uint256 pricePerCredit, uint8 status)",
  "event ProjectSubmitted(uint256 indexed projectId, address indexed seller, uint256 requestedCredits)",
  "event ProjectAssessed(uint256 indexed projectId, uint256 approvedCredits, uint256 riskScore, uint256 requiredStake)",
  "event StakeDeposited(uint256 indexed projectId, address indexed seller, uint256 amount)",
  "event CreditsMinted(uint256 indexed projectId, uint256 amount, uint256 pricePerCredit)",
  "event CreditsPurchased(uint256 indexed projectId, address indexed buyer, uint256 amount, uint256 totalCost)",
  "function rejectProject(uint256 projectId, uint256 slashBps)",
  "function registerReviewer()",
  "function openChallenge(uint256 projectId)",
  "function voteOnChallenge(uint256 projectId, bool fraudDetected)",
  "function demoResolveChallenge(uint256 projectId, bool upholdChallenge)",
  "function finalizeChallenge(uint256 projectId, uint256 slashBps, uint256 burnAmount, uint256 trustPenalty)",
  "function challenges(uint256) view returns (address challenger, uint256 challengerBond, uint256 fraudVotes, uint256 validVotes, uint256 deadline, bool finalized)",
  "function reviewers(address) view returns (uint256 stakedAmount, uint256 reputation, bool active)",
  "function reviewerBond() view returns (uint256)",
  "function hasVotedOnChallenge(uint256, address) view returns (bool)",
  "function reviewQuorum() view returns (uint256)",
  "event ChallengeOpened(uint256 indexed projectId, address indexed challenger, uint256 deadline)",
  "event ChallengeVoted(uint256 indexed projectId, address indexed reviewer, bool fraudDetected)",
  "event ChallengeFinalized(uint256 indexed projectId, bool fraudConfirmed, uint256 slashedAmount)",
  "event RewardIssued(uint256 indexed projectId, uint256 rewardAmount, uint256 updatedTrustScore)",
  "event CreditsRetired(uint256 indexed projectId, address indexed retiree, uint256 amount, uint256 certTokenId)"
] as const;

export const retireCertificateAbi = [
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function certs(uint256 tokenId) view returns (uint256 projectId, address retiree, uint256 creditsRetired, uint256 retiredAt, string tokenUri)",
  "event CertificateMinted(uint256 indexed tokenId, uint256 indexed projectId, address indexed retiree, uint256 creditsRetired)"
] as const;

export const governanceTokenAbi = [
  "function balanceOf(address account) view returns (uint256)",
  "function getVotes(address account) view returns (uint256)",
  "function delegates(address account) view returns (address)",
  "function delegate(address delegatee)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
] as const;

export const governorAbi = [
  "function name() view returns (string)",
  "function votingDelay() view returns (uint256)",
  "function votingPeriod() view returns (uint256)",
  "function proposalThreshold() view returns (uint256)",
  "function quorum(uint256 blockNumber) view returns (uint256)",
  "function state(uint256 proposalId) view returns (uint8)",
  "function proposalVotes(uint256 proposalId) view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)",
  "function proposalDeadline(uint256 proposalId) view returns (uint256)",
  "function proposalSnapshot(uint256 proposalId) view returns (uint256)",
  "function hasVoted(uint256 proposalId, address account) view returns (bool)",
  "function getVotes(address account, uint256 blockNumber) view returns (uint256)",
  "function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) returns (uint256)",
  "function castVote(uint256 proposalId, uint8 support) returns (uint256)",
  "function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) returns (uint256)",
  "function hashProposal(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) view returns (uint256)",
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)",
  "event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)",
  "event ProposalExecuted(uint256 indexed proposalId)"
] as const;

export const erc20Abi = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
] as const;

export const tcutSaleAbi = [
  "function rate() view returns (uint256)",
  "function faucetAmount() view returns (uint256)",
  "function faucetCooldown() view returns (uint256)",
  "function lastClaim(address) view returns (uint256)",
  "function timeUntilNextClaim(address user) view returns (uint256)",
  "function tokenBalance() view returns (uint256)",
  "function buyTokens() payable",
  "function claimFaucet()",
  "function token() view returns (address)",
  "event TokensPurchased(address indexed buyer, uint256 ethPaid, uint256 tcutReceived)",
  "event FaucetClaimed(address indexed claimant, uint256 amount)"
] as const;

export const carbonCreditAbi = [
  "function balanceOf(address account, uint256 id) view returns (uint256)"
] as const;

export const riskOracleAbi = [
  "function subscriptionId() view returns (uint64)",
  "function donId() view returns (bytes32)",
  "function gasLimit() view returns (uint32)",
  "function oracleSource() view returns (string)",
  "function getOracleData(uint256 projectId) view returns (uint256 solar, uint256 precip, uint256 ts, bool ok)",
  "function requestOracleData(uint256 projectId, string lat, string lon) returns (bytes32)",
  "function ownerFulfill(uint256 projectId, uint256 solarScaled, uint256 precipScaled)",
  "function updateConfig(bytes32 donId, uint64 subscriptionId, uint32 gasLimit)",
  "event OracleRequested(uint256 indexed projectId, bytes32 indexed requestId, string lat, string lon)",
  "event OracleFulfilled(uint256 indexed projectId, uint256 solarScaled, uint256 precipScaled)",
  "event OracleError(uint256 indexed projectId, bytes32 indexed requestId, bytes err)"
] as const;
