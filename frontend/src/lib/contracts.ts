export const carbonMarketAbi = [
  "function assessor() view returns (address)",
  "function treasury() view returns (address)",
  "function utilityToken() view returns (address)",
  "function carbonToken() view returns (address)",
  "function submitProject(string metadataUri, string sourceDataHash, uint256 requestedCredits, uint256 vintageYear) returns (uint256)",
  "function assessProject(uint256 projectId, uint256 approvedCredits, uint256 riskScore, uint256 trustScore, uint256 requiredStake)",
  "function depositProjectStake(uint256 projectId, uint256 amount)",
  "function mintAndListCredits(uint256 projectId, uint256 pricePerCredit, string tokenUri)",
  "function buyCredits(uint256 projectId, uint256 amount)",
  "function projects(uint256) view returns (uint256 id, address seller, string metadataUri, string sourceDataHash, uint256 requestedCredits, uint256 approvedCredits, uint256 vintageYear, uint256 riskScore, uint256 trustScore, uint256 requiredStake, uint256 stakedAmount, uint256 availableCredits, uint256 pricePerCredit, uint8 status)",
  "event ProjectSubmitted(uint256 indexed projectId, address indexed seller, uint256 requestedCredits)",
  "event ProjectAssessed(uint256 indexed projectId, uint256 approvedCredits, uint256 riskScore, uint256 requiredStake)",
  "event StakeDeposited(uint256 indexed projectId, address indexed seller, uint256 amount)",
  "event CreditsMinted(uint256 indexed projectId, uint256 amount, uint256 pricePerCredit)",
  "event CreditsPurchased(uint256 indexed projectId, address indexed buyer, uint256 amount, uint256 totalCost)",
  "event ChallengeOpened(uint256 indexed projectId, address indexed challenger, uint256 deadline)",
  "event ChallengeFinalized(uint256 indexed projectId, bool fraudConfirmed, uint256 slashedAmount)",
  "event RewardIssued(uint256 indexed projectId, uint256 rewardAmount, uint256 updatedTrustScore)"
] as const;

export const erc20Abi = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
] as const;

export const carbonCreditAbi = [
  "function balanceOf(address account, uint256 id) view returns (uint256)"
] as const;
