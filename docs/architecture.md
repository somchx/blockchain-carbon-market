# Prototype Architecture

## 1. Data Layer

The prototype simulates pre-blockchain integrity checks from multiple sources:

- `User input`
- `Mock IoT confidence`
- `Mock government confidence`
- `Historical confidence`

These signals are fused into a deterministic assessment so the demo is reproducible.

## 2. Machine Learning Layer

The current prototype uses a rule-based scoring engine that stands in for a trainable ML model. It calculates:

- `approvedReduction`
- `approvedCredits`
- `riskScore`
- `trustScore`
- `requiredStake`

This keeps the prototype transparent and easy to evaluate while preserving the architecture for a future ML replacement.

## 3. DeFi Layer

On-chain enforcement happens in `CarbonMarket.sol`:

- Sellers submit projects
- Assessor publishes risk results
- Sellers deposit required stake
- Carbon credits are minted as ERC-1155 tokens
- Buyers purchase listed credits
- Reviewers open fraud challenges and vote
- Challenge resolution triggers slashing, trust penalties, and optional burn
- Honest projects can receive rewards and trust boosts

## 4. Decentralized Verification

The prototype reduces central dependency in two ways:

- Assessment inputs are multi-source, not single self-reported data
- Post-mint verification is challenge-based and reviewer-driven

For a future production version, the off-chain assessor can be replaced by:

- committee-signed oracle updates
- zk-backed model outputs
- DAO-governed reviewer admission and slashing
