import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  // Read existing deployment to get addresses
  const deploymentPath = join("deployments", `${network.name}.json`);
  const existing = JSON.parse(readFileSync(deploymentPath, "utf8"));

  // Read the oracle JavaScript source
  const oracleSource = readFileSync(join("src", "oracleSource.js"), "utf8");

  // Chainlink Functions config for Sepolia
  const SEPOLIA_ROUTER = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";
  const SEPOLIA_DON_ID = "0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000";
  // subscriptionId: 0 initially — owner must call updateConfig() after creating subscription
  const INITIAL_SUB_ID = process.env.CHAINLINK_SUB_ID ? Number(process.env.CHAINLINK_SUB_ID) : 0;

  const router = network.name === "sepolia" ? SEPOLIA_ROUTER : ethers.ZeroAddress;
  const donId  = network.name === "sepolia" ? SEPOLIA_DON_ID : ethers.ZeroHash;

  console.log("Deployer:", deployer.address);
  console.log("Network:", network.name);
  console.log("Chainlink Router:", router);
  console.log("Subscription ID:", INITIAL_SUB_ID, "(set CHAINLINK_SUB_ID env var to configure)");

  const Oracle = await ethers.getContractFactory("RiskOracleConsumer");
  const oracle = await Oracle.deploy(router, donId, INITIAL_SUB_ID, oracleSource);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();

  console.log("RiskOracleConsumer:", oracleAddress);

  // Update deployment JSON
  const updated = { ...existing, riskOracle: oracleAddress };
  writeFileSync(deploymentPath, `${JSON.stringify(updated, null, 2)}\n`);

  // Update frontend env template
  const frontendEnvPath = join("deployments", `${network.name}.frontend.env`);
  let frontendEnv = readFileSync(frontendEnvPath, "utf8");
  if (!frontendEnv.includes("VITE_ORACLE_ADDRESS")) {
    frontendEnv += `VITE_ORACLE_ADDRESS=${oracleAddress}\n`;
    writeFileSync(frontendEnvPath, frontendEnv);
  }

  console.log("\n✅ Oracle deployed!");
  console.log("\nNext steps:");
  console.log("1. Go to https://functions.chain.link/sepolia");
  console.log("2. Create a new subscription");
  console.log("3. Fund it with LINK (https://faucets.chain.link/sepolia)");
  console.log(`4. Add consumer: ${oracleAddress}`);
  console.log("5. Copy the subscription ID, then call:");
  console.log(`   oracle.updateConfig(SEPOLIA_DON_ID, <subId>, 300000)`);
  console.log("\nUpdate Vercel env:");
  console.log(`   VITE_ORACLE_ADDRESS=${oracleAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
