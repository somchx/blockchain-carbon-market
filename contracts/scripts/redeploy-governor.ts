import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

const DEPLOYMENTS_FILE = path.join(__dirname, "../deployments/sepolia.json");
const FRONTEND_ENV_FILE = path.join(__dirname, "../../frontend/.env");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const deployments = JSON.parse(fs.readFileSync(DEPLOYMENTS_FILE, "utf-8"));

  const CGOV_ADDRESS = deployments.governanceToken;
  const MARKET_ADDRESS = deployments.market;
  const TREASURY = deployer.address;

  if (!CGOV_ADDRESS || !MARKET_ADDRESS) {
    throw new Error("Missing governanceToken or market in deployments");
  }

  console.log("CGOV:", CGOV_ADDRESS);
  console.log("CarbonMarket:", MARKET_ADDRESS);
  console.log("Treasury (owner):", TREASURY);

  // Deploy new GovernorDAO
  const GovernorDAO = await ethers.getContractFactory("GovernorDAO");
  const governor = await GovernorDAO.deploy(CGOV_ADDRESS, TREASURY, deployer.address);
  await governor.waitForDeployment();
  const governorAddress = await governor.getAddress();
  console.log("New GovernorDAO deployed:", governorAddress);

  // Wire CarbonMarket to the new Governor
  const CarbonMarket = await ethers.getContractFactory("CarbonMarket");
  const market = CarbonMarket.attach(MARKET_ADDRESS) as any;
  const tx = await market.setGovernorContract(governorAddress);
  await tx.wait();
  console.log("CarbonMarket.governorContract set to:", governorAddress);

  // Update deployments/sepolia.json
  deployments.governor = governorAddress;
  fs.writeFileSync(DEPLOYMENTS_FILE, JSON.stringify(deployments, null, 2));
  console.log("Updated deployments/sepolia.json");

  // Update frontend/.env
  let envContent = fs.readFileSync(FRONTEND_ENV_FILE, "utf-8");
  if (envContent.includes("VITE_GOVERNOR_ADDRESS=")) {
    envContent = envContent.replace(
      /VITE_GOVERNOR_ADDRESS=.*/,
      `VITE_GOVERNOR_ADDRESS=${governorAddress}`
    );
  } else {
    envContent += `\nVITE_GOVERNOR_ADDRESS=${governorAddress}\n`;
  }
  fs.writeFileSync(FRONTEND_ENV_FILE, envContent);
  console.log("Updated frontend/.env  VITE_GOVERNOR_ADDRESS=", governorAddress);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
