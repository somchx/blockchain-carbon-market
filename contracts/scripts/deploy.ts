import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ethers, network } from "hardhat";

async function main() {
  const [deployer, fallbackAssessor, fallbackTreasury] = await ethers.getSigners();
  const assessorAddress = process.env.ASSESSOR_ADDRESS || fallbackAssessor.address;
  const treasuryAddress = process.env.TREASURY_ADDRESS || fallbackTreasury.address;

  const PlatformToken = await ethers.getContractFactory("PlatformToken");
  const utilityToken = await PlatformToken.deploy(deployer.address);
  await utilityToken.waitForDeployment();

  const CarbonCreditToken = await ethers.getContractFactory("CarbonCreditToken");
  const carbonToken = await CarbonCreditToken.deploy(deployer.address);
  await carbonToken.waitForDeployment();

  const CarbonMarket = await ethers.getContractFactory("CarbonMarket");
  const market = await CarbonMarket.deploy(
    deployer.address,
    assessorAddress,
    treasuryAddress,
    await utilityToken.getAddress(),
    await carbonToken.getAddress()
  );
  await market.waitForDeployment();

  await carbonToken.setMarket(await market.getAddress());

  const deployment = {
    network: network.name,
    chainId: Number(network.config.chainId ?? 0),
    deployer: deployer.address,
    assessor: assessorAddress,
    treasury: treasuryAddress,
    utilityToken: await utilityToken.getAddress(),
    carbonToken: await carbonToken.getAddress(),
    market: await market.getAddress()
  };

  mkdirSync("deployments", { recursive: true });
  writeFileSync(
    join("deployments", `${network.name}.json`),
    `${JSON.stringify(deployment, null, 2)}\n`
  );
  writeFileSync(
    join("deployments", `${network.name}.frontend.env`),
    [
      "VITE_API_BASE_URL=http://localhost:4000/api",
      `VITE_CHAIN_ID=${deployment.chainId}`,
      `VITE_CHAIN_LABEL=${network.name === "sepolia" ? "Sepolia" : network.name}`,
      `VITE_EXPLORER_BASE_URL=${network.name === "sepolia" ? "https://sepolia.etherscan.io" : ""}`,
      `VITE_MARKET_ADDRESS=${deployment.market}`,
      `VITE_UTILITY_TOKEN_ADDRESS=${deployment.utilityToken}`,
      `VITE_CARBON_TOKEN_ADDRESS=${deployment.carbonToken}`,
      `VITE_ASSESSOR_ADDRESS=${deployment.assessor}`,
      `VITE_EXPECTED_SELLER_ADDRESS=${deployment.deployer}`,
      ""
    ].join("\n")
  );

  console.log("UtilityToken:", deployment.utilityToken);
  console.log("CarbonCreditToken:", deployment.carbonToken);
  console.log("CarbonMarket:", deployment.market);
  console.log("Deployment manifest:", `deployments/${network.name}.json`);
  console.log("Frontend env template:", `deployments/${network.name}.frontend.env`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
