/**
 * Deploy TCUTSale (with faucet + ETH buy) and fund via PlatformToken.faucet.
 * Run: npx hardhat run scripts/deploy-tcut-sale.ts --network sepolia
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const deploymentPath = join("deployments", `${network.name}.json`);
  const existing = JSON.parse(readFileSync(deploymentPath, "utf8"));

  const RATE          = 10_000_000n;                      // 0.001 ETH = 10,000 TCUT
  const FAUCET_AMOUNT = ethers.parseEther("10000");       // 10,000 TCUT per claim
  const FAUCET_CD     = 86400n;                           // 24 hours in seconds
  const FUND_AMOUNT   = ethers.parseEther("5000000");     // seed 5M TCUT

  console.log("Deployer:       ", deployer.address);
  console.log("TCUT address:   ", existing.utilityToken);

  const TCUTSale = await ethers.getContractFactory("TCUTSale");
  const sale = await TCUTSale.deploy(existing.utilityToken, RATE, FAUCET_AMOUNT, FAUCET_CD);
  await sale.waitForDeployment();
  const saleAddress = await sale.getAddress();
  console.log("\nTCUTSale deployed:", saleAddress);

  const token = await ethers.getContractAt("PlatformToken", existing.utilityToken);
  await (token as any).faucet(saleAddress, FUND_AMOUNT);
  console.log("Funded with 5,000,000 TCUT ✅");

  // Update deployments/sepolia.json
  const updated = { ...existing, tcutSale: saleAddress };
  writeFileSync(deploymentPath, `${JSON.stringify(updated, null, 2)}\n`);

  // Update deployments/sepolia.frontend.env
  const envPath = join("deployments", `${network.name}.frontend.env`);
  let envContent = readFileSync(envPath, "utf8");
  if (envContent.includes("VITE_TCUT_SALE_ADDRESS")) {
    envContent = envContent.replace(/VITE_TCUT_SALE_ADDRESS=.*/, `VITE_TCUT_SALE_ADDRESS=${saleAddress}`);
  } else {
    envContent += `VITE_TCUT_SALE_ADDRESS=${saleAddress}\n`;
  }
  writeFileSync(envPath, envContent);

  console.log("\n✅ Done!");
  console.log("VITE_TCUT_SALE_ADDRESS =", saleAddress);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
