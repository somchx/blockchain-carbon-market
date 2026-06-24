// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice DAO Governor with proposal bond mechanics.
/// Proposers stake 500 CGOV when submitting a proposal.
/// - If proposal passes and is executed → bond is refunded.
/// - If proposal is defeated             → bond is slashed to treasury.
///
/// Owner can call demoExecute / demoDefeat to instantly resolve any live
/// proposal for demonstration purposes (bypasses the voting period).
///
/// votingDelay:       1 block  (~12 s on Sepolia)
/// votingPeriod:      30 blocks (~6 min on Sepolia)
/// proposalThreshold: 1 000 CGOV
/// quorum:            4 % of total CGOV supply
contract GovernorDAO is
    Governor,
    GovernorCountingSimple,
    GovernorSettings,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    Ownable
{
    uint256 public proposalBond = 500 * 10 ** 18; // 500 CGOV
    address public treasury;
    IERC20 public immutable govToken;

    // 0 = not demo-resolved, 1 = demo-executed, 2 = demo-defeated
    mapping(uint256 => uint8) private _demoState;

    mapping(uint256 => address) private _proposalProposer;
    mapping(uint256 => uint256) private _proposalBondAmount;

    event ProposalBondRefunded(uint256 indexed proposalId, address indexed proposer, uint256 amount);
    event ProposalBondSlashed(uint256 indexed proposalId, address indexed proposer, uint256 amount);

    constructor(IVotes governanceToken, address treasuryAddress, address initialOwner)
        Governor("CarbonMarketDAO")
        GovernorSettings(
            1,                    // votingDelay: 1 block
            30,                   // votingPeriod: 30 blocks
            1_000 * 10 ** 18      // proposalThreshold: 1000 CGOV
        )
        GovernorVotes(governanceToken)
        GovernorVotesQuorumFraction(4)
        Ownable(initialOwner)
    {
        govToken = IERC20(address(governanceToken));
        treasury = treasuryAddress;
    }

    // ─── Required overrides ────────────────────────────────────────────────

    function votingDelay()
        public view override(Governor, GovernorSettings)
        returns (uint256)
    { return super.votingDelay(); }

    function votingPeriod()
        public view override(Governor, GovernorSettings)
        returns (uint256)
    { return super.votingPeriod(); }

    function quorum(uint256 blockNumber)
        public view override(Governor, GovernorVotesQuorumFraction)
        returns (uint256)
    { return super.quorum(blockNumber); }

    function proposalThreshold()
        public view override(Governor, GovernorSettings)
        returns (uint256)
    { return super.proposalThreshold(); }

    // ─── State override: reflect demo resolutions ─────────────────────────

    function state(uint256 proposalId)
        public view override
        returns (ProposalState)
    {
        uint8 demo = _demoState[proposalId];
        if (demo == 1) return ProposalState.Executed;
        if (demo == 2) return ProposalState.Defeated;
        return super.state(proposalId);
    }

    // ─── Proposal bond ────────────────────────────────────────────────────

    function setProposalBond(uint256 amount) external onlyOwner {
        proposalBond = amount;
    }

    function getProposalBond(uint256 proposalId) external view returns (uint256) {
        return _proposalBondAmount[proposalId];
    }

    function getProposalProposer(uint256 proposalId) external view returns (address) {
        return _proposalProposer[proposalId];
    }

    /// @dev Override propose() to collect proposalBond from proposer.
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override returns (uint256 proposalId) {
        proposalId = super.propose(targets, values, calldatas, description);
        if (proposalBond > 0) {
            _proposalProposer[proposalId] = msg.sender;
            _proposalBondAmount[proposalId] = proposalBond;
            require(
                govToken.transferFrom(msg.sender, address(this), proposalBond),
                "GovernorDAO: bond transfer failed"
            );
        }
    }

    /// @dev Override execute() to refund bond on success.
    function execute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public payable override returns (uint256 proposalId) {
        proposalId = super.execute(targets, values, calldatas, descriptionHash);
        _refundBond(proposalId);
    }

    // ─── Demo helpers (owner only) ─────────────────────────────────────────

    /// @notice Instantly execute a proposal's on-chain calls. Bond is refunded.
    /// The owner bypasses the voting period for demonstration purposes.
    function demoExecute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) external onlyOwner {
        uint256 proposalId = hashProposal(targets, values, calldatas, descriptionHash);
        require(_demoState[proposalId] == 0, "GovernorDAO: already resolved");

        _demoState[proposalId] = 1;

        for (uint256 i = 0; i < targets.length; ++i) {
            (bool success, bytes memory returndata) = targets[i].call{value: values[i]}(calldatas[i]);
            Address.verifyCallResult(success, returndata);
        }

        emit ProposalExecuted(proposalId);
        _refundBond(proposalId);
    }

    /// @notice Instantly defeat a proposal. Bond is slashed to treasury.
    function demoDefeat(uint256 proposalId) external onlyOwner {
        require(_demoState[proposalId] == 0, "GovernorDAO: already resolved");
        _demoState[proposalId] = 2;
        _slashBond(proposalId);
    }

    // ─── Internal bond helpers ────────────────────────────────────────────

    function _refundBond(uint256 proposalId) internal {
        address proposer = _proposalProposer[proposalId];
        uint256 amount   = _proposalBondAmount[proposalId];
        if (proposer == address(0) || amount == 0) return;
        delete _proposalBondAmount[proposalId];
        require(govToken.transfer(proposer, amount), "GovernorDAO: refund failed");
        emit ProposalBondRefunded(proposalId, proposer, amount);
    }

    function _slashBond(uint256 proposalId) internal {
        address proposer = _proposalProposer[proposalId];
        uint256 amount   = _proposalBondAmount[proposalId];
        if (proposer == address(0) || amount == 0) return;
        delete _proposalBondAmount[proposalId];
        require(govToken.transfer(treasury, amount), "GovernorDAO: slash failed");
        emit ProposalBondSlashed(proposalId, proposer, amount);
    }
}
