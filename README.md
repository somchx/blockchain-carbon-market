# High-Integrity Blockchain Carbon Credit Market in Thailand

Prototype marketplace for carbon credit issuance and trading that combines:

- `Blockchain` for immutable records and settlement
- `DeFi` for risk-based staking, slashing, and rewards
- `Machine Learning style risk scoring` for project assessment
- `Mock multi-source validation` for pre-blockchain data integrity

## Architecture

- `contracts/`: Solidity contracts for staking, issuance, trading, challenge, slashing, and rewards
- `backend/`: Express API for data fusion, mock IoT/government data, risk scoring, trust score, and demo orchestration
- `frontend/`: React dashboard for sellers, buyers, and reviewers

## Core flow

1. Seller connects wallet and submits a carbon project.
2. Backend aggregates `user input + mock IoT + mock government + historical data`.
3. Risk engine computes:
   - `approvedReduction`
   - `riskScore`
   - `trustScore`
   - `requiredStake`
4. Seller stakes platform tokens.
5. Carbon credits are tokenized as ERC-1155 units and listed in the marketplace.
6. Reviewers can challenge suspicious projects by bonding stake and voting.
7. Successful fraud detection triggers `slashing`, `trust reduction`, and optional `credit burn`.
8. Honest projects receive `reward` and trust boosts over time.

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
   - approve a purchase and buy one credit

Important:

- Your wallet address is safe to share, but your private key or seed phrase must never be shared.
- Transactions are signed only in your browser wallet.
- To use a public testnet, deploy the contracts there first and put those addresses in `frontend/.env`.

## Notes

- This prototype intentionally uses `mock data` instead of live IoT or satellite feeds.
- The off-chain risk engine is transparent and deterministic for demo purposes.
- The challenge process is decentralized at the reviewer layer, while ML assessment remains off-chain due to compute cost.
