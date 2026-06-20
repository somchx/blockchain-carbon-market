// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";

/// @notice DAO Governor for Carbon Market platform governance
/// votingDelay:   1 block  (~12s on Sepolia, instant on Hardhat)
/// votingPeriod:  50 blocks (~10 min on Sepolia)
/// quorum:        4% of total CGOV supply
/// proposalThreshold: 1000 CGOV
contract GovernorDAO is
    Governor,
    GovernorCountingSimple,
    GovernorSettings,
    GovernorVotes,
    GovernorVotesQuorumFraction
{
    constructor(IVotes governanceToken)
        Governor("CarbonMarketDAO")
        GovernorSettings(
            1,    // votingDelay: 1 block
            50,   // votingPeriod: 50 blocks
            1_000 * 10 ** 18  // proposalThreshold: 1000 CGOV
        )
        GovernorVotes(governanceToken)
        GovernorVotesQuorumFraction(4)
    {}

    // Required overrides to resolve diamond inheritance

    function votingDelay()
        public view override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public view override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber)
        public view override(Governor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function proposalThreshold()
        public view override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }
}
