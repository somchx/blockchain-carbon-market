# High-Integrity Blockchain Carbon Credit Market in Thailand

Prototype marketplace for carbon credit issuance and trading that combines:

- `Blockchain` for immutable records and settlement
- `DeFi` for risk-based staking, slashing, and rewards
- `Rule-based risk scoring` informed by real climate signals
- `Hybrid off-chain validation` with real NASA POWER, optional OpenWeather, and IPFS evidence

## Architecture

- `contracts/`: Solidity contracts for staking, issuance, trading, challenge, slashing, and rewards
- `backend/`: Express API for data fusion, risk scoring, trust score, IPFS uploads, certificate generation, and demo orchestration
- `frontend/`: React dashboard for sellers, buyers, and reviewers

## Core flow

1. Seller connects wallet and submits a carbon project.
2. Backend aggregates `user input + climate signals + derived confidence scores`.
3. Risk engine computes:
   - `approvedCredits`
   - `riskScore`
   - `trustScore`
   - `requiredStake`
4. Seller stakes platform tokens.
5. Verifier/assessor publishes the on-chain assessment.
6. Carbon credits are tokenized as ERC-1155 units and listed in the marketplace.
7. Buyers purchase credits, can retire them, and receive an ERC-721 certificate.
8. Reviewers can challenge suspicious projects by bonding stake and voting.
9. Successful fraud detection triggers `slashing`, `trust reduction`, and optional `credit burn`.
10. Honest projects can receive rewards and trust boosts.

## Stack

- `Hardhat + Solidity`
- `Node.js + Express + TypeScript`
- `React + Vite + TypeScript`
- `ethers v6`

## Run locally

Install dependencies:

```bash
npm install
```

Start the backend and frontend:

```bash
npm run dev
```

In another terminal, compile contracts:

```bash
npm run build -w contracts
```

Run contract tests:

```bash
npm run test -w contracts
```

Deploy to a local Hardhat chain:

```bash
npm run deploy -w contracts
```

## Run on Sepolia

1. Copy [contracts/.env.example](/Users/somchx/Desktop/blockchain_project/contracts/.env.example) to `contracts/.env`
2. Fill in:
   - `SEPOLIA_RPC_URL`
   - `DEPLOYER_PRIVATE_KEY`
   - `ASSESSOR_ADDRESS`
   - `TREASURY_ADDRESS`
3. Make sure the deployer wallet has Sepolia ETH for gas.
4. Deploy contracts:

```bash
npm run deploy:sepolia -w contracts
```

5. After deploy, open the generated file:
   - [contracts/deployments/sepolia.frontend.env](/Users/somchx/Desktop/blockchain_project/contracts/deployments/sepolia.frontend.env)
6. Copy those values into `frontend/.env`
7. Restart the frontend dev server
8. In the browser, connect MetaMask and click `Switch to Sepolia`

## Connect a real wallet

The frontend now supports MetaMask or any injected EVM wallet.

1. Copy [frontend/.env.example](/Users/somchx/Desktop/blockchain_project/frontend/.env.example) to `frontend/.env`
2. Fill in:
   - `VITE_MARKET_ADDRESS`
   - `VITE_UTILITY_TOKEN_ADDRESS`
   - `VITE_CARBON_TOKEN_ADDRESS`
   - `VITE_ASSESSOR_ADDRESS`
   - `VITE_CHAIN_ID`
3. Start the frontend and connect your wallet in the browser.
4. The dApp lets you:
   - submit a seller project on-chain
   - publish assessor risk results
   - approve and stake utility tokens
   - mint and list credits
   - approve a purchase and buy credits
   - retire credits and mint a certificate NFT

Important:

- Your wallet address is safe to share, but your private key or seed phrase must never be shared.
- Transactions are signed only in your browser wallet.
- To use a public testnet, deploy the contracts there first and put those addresses in `frontend/.env`.

## Notes

- The current prototype uses `real NASA POWER` climate data, `optional OpenWeatherMap`, and `manual project input`; it does not yet integrate full live IoT hardware, satellite NDVI, or government registries.
- Evidence and retirement certificates are pinned to IPFS through Pinata.
- The off-chain risk engine is transparent and deterministic for demo purposes.
- The challenge process is decentralized at the reviewer layer, while the assessment logic remains off-chain.
- The current marketplace uses a platform utility token, not a production stablecoin rail.
