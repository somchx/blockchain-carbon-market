/**
 * Deploy CGOVSale (faucet + ETH buy) and fund from deployer's CGOV balance.
 *
 * Config:
 *   rate         = 10,000  → 1 ETH = 10,000 CGOV
 *   faucetAmount = 500 CGOV per claim
 *   faucetCD     = 24 hours
 *   fundAmount   = 100,000 CGOV seeded into sale contract
 *
 * Run: npx hardhat run scripts/deploy-cgov-sale.ts --network sepolia
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const deploymentPath = join("deployments", `${network.name}.json`);
  const existing = JSON.parse(readFileSync(deploymentPath, "utf8"));

  const RATE          = 10_000n;                       // 1 ETH = 10,000 CGOV
  const FAUCET_AMOUNT = ethers.parseEther("500");      // 500 CGOV per faucet claim
  const FAUCET_CD     = 86400n;                        // 24 hours cooldown
  const FUND_AMOUNT   = ethers.parseEther("100000");   // seed 100,000 CGOV

  console.log("Deployer:       ", deployer.address);
  console.log("CGOV address:   ", existing.governanceToken);

  const CGOVSale = await ethers.getContractFactory("CGOVSale");
  const sale = await CGOVSale.deploy(
    existing.governanceToken,
    RATE,
    FAUCET_AMOUNT,
    FAUCET_CD
  );
  await sale.waitForDeployment();
  const saleAddress = await sale.getAddress();
  console.log("\nCGOVSale deployed:", saleAddress);

  // Transfer 100,000 CGOV from deployer to sale contract
  const govToken = await ethers.getContractAt("GovernanceToken", existing.governanceToken);
  const deployerBalance = await govToken.balanceOf(deployer.address);
  console.log("Deployer CGOV balance:", ethers.formatEther(deployerBalance));

  if (deployerBalance < FUND_AMOUNT) {
    throw new Error(`Deployer has insufficient CGOV. Has: ${ethers.formatEther(deployerBalance)}, needs: 100,000`);
  }

  const transferTx = await govToken.transfer(saleAddress, FUND_AMOUNT);
  await transferTx.wait();
  console.log("Funded CGOVSale with 100,000 CGOV ✅");

  const inventory = await sale.tokenBalance();
  console.log("Sale contract inventory:", ethers.formatEther(inventory), "CGOV");

  // Update deployments/sepolia.json
  const updated = { ...existing, cgovSale: saleAddress };
  writeFileSync(deploymentPath, `${JSON.stringify(updated, null, 2)}\n`);

  // Update deployments/sepolia.frontend.env
  const envPath = join("deployments", `${network.name}.frontend.env`);
  let envContent = readFileSync(envPath, "utf8");
  if (envContent.includes("VITE_CGOV_SALE_ADDRESS")) {
    envContent = envContent.replace(/VITE_CGOV_SALE_ADDRESS=.*/, `VITE_CGOV_SALE_ADDRESS=${saleAddress}`);
  } else {
    envContent += `VITE_CGOV_SALE_ADDRESS=${saleAddress}\n`;
  }
  writeFileSync(envPath, envContent);

  console.log("\n✅ Done!");
  console.log("VITE_CGOV_SALE_ADDRESS =", saleAddress);
  console.log("\nCopy this to frontend/.env:");
  console.log(`VITE_CGOV_SALE_ADDRESS=${saleAddress}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
