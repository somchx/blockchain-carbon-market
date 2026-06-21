/**
 * Redeploy only CarbonMarket — keeps all other contract addresses the same.
 * Run: ASSESSOR_ADDRESS=0x... npx hardhat run scripts/redeploy-market.ts --network sepolia
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const deploymentPath = join("deployments", `${network.name}.json`);
  const existing = JSON.parse(readFileSync(deploymentPath, "utf8"));

  const assessorAddress: string = process.env.ASSESSOR_ADDRESS ?? existing.assessor;
  const treasuryAddress: string = process.env.TREASURY_ADDRESS ?? existing.treasury;

  console.log("Deployer:  ", deployer.address);
  console.log("Assessor:  ", assessorAddress);
  console.log("Treasury:  ", treasuryAddress);
  console.log("UtilToken: ", existing.utilityToken);
  console.log("CarbonTok: ", existing.carbonToken);
  console.log("RetireCert:", existing.retireCertificate);
  console.log("Governor:  ", existing.governor);

  // Deploy new CarbonMarket
  const CarbonMarket = await ethers.getContractFactory("CarbonMarket");
  const market = await CarbonMarket.deploy(
    deployer.address,
    assessorAddress,
    treasuryAddress,
    existing.utilityToken,
    existing.carbonToken
  );
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log("\nNew CarbonMarket:", marketAddress);

  // Wire up CarbonCreditToken → new market
  const carbonToken = await ethers.getContractAt("CarbonCreditToken", existing.carbonToken);
  await (carbonToken as any).setMarket(marketAddress);
  console.log("CarbonCreditToken.setMarket ✅");

  // Wire up RetireCertificate → new market (both directions)
  const retireCert = await ethers.getContractAt("RetireCertificate", existing.retireCertificate);
  await (retireCert as any).setMarket(marketAddress);
  console.log("RetireCertificate.setMarket ✅");
  await (market as any).setRetireCertificate(existing.retireCertificate);
  console.log("CarbonMarket.setRetireCertificate ✅");

  // Transfer CarbonMarket ownership to GovernorDAO (same as original deploy)
  await (market as any).transferOwnership(existing.governor);
  console.log("Ownership transferred to GovernorDAO ✅");

  // Update deployment JSON
  const updated = { ...existing, market: marketAddress };
  writeFileSync(deploymentPath, `${JSON.stringify(updated, null, 2)}\n`);

  // Update frontend.env
  const envPath = join("deployments", `${network.name}.frontend.env`);
  let envContent = readFileSync(envPath, "utf8");
  envContent = envContent.replace(/VITE_MARKET_ADDRESS=.*/,  `VITE_MARKET_ADDRESS=${marketAddress}`);
  writeFileSync(envPath, envContent);

  console.log("\n✅ Done!");
  console.log("New VITE_MARKET_ADDRESS =", marketAddress);
  console.log("Update this in: frontend/.env and Vercel dashboard");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
