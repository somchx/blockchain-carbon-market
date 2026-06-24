import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ethers, network } from "hardhat";

type DistributionEntry = {
  label?: string;
  address: string;
  amount: string;
};

function loadDistributionFile() {
  const explicit = process.env.CGOV_DISTRIBUTION_FILE;
  const fallback = join(__dirname, "cgov-distribution.demo.json");
  const filePath = explicit ?? fallback;

  if (!existsSync(filePath)) {
    throw new Error(`Distribution file not found: ${filePath}`);
  }

  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as DistributionEntry[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`Distribution file is empty or invalid: ${filePath}`);
  }

  return { filePath, entries: parsed };
}

async function resolveGovernanceTokenAddress() {
  if (process.env.GOVERNANCE_TOKEN_ADDRESS) {
    return process.env.GOVERNANCE_TOKEN_ADDRESS;
  }

  const deploymentPath = join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!existsSync(deploymentPath)) {
    throw new Error("Missing GOVERNANCE_TOKEN_ADDRESS and no deployment manifest found");
  }

  const deployment = JSON.parse(readFileSync(deploymentPath, "utf8")) as { governanceToken?: string };
  if (!deployment.governanceToken) {
    throw new Error(`governanceToken missing in ${deploymentPath}`);
  }

  return deployment.governanceToken;
}

async function main() {
  const [signer] = await ethers.getSigners();
  const governanceTokenAddress = await resolveGovernanceTokenAddress();
  const { filePath, entries } = loadDistributionFile();

  const govToken = await ethers.getContractAt("GovernanceToken", governanceTokenAddress, signer);
  const signerAddress = await signer.getAddress();
  const owner = await govToken.owner();
  const signerBalance = await govToken.balanceOf(signerAddress);

  let total = 0n;
  for (const entry of entries) {
    if (!ethers.isAddress(entry.address)) {
      throw new Error(`Invalid recipient address: ${entry.address}`);
    }
    const parsedAmount = ethers.parseUnits(entry.amount, 18);
    if (parsedAmount <= 0n) {
      throw new Error(`Invalid amount for ${entry.address}: ${entry.amount}`);
    }
    total += parsedAmount;
  }

  const canMint = owner.toLowerCase() === signerAddress.toLowerCase();
  if (!canMint && signerBalance < total) {
    throw new Error(`Signer balance is insufficient: need ${ethers.formatUnits(total, 18)} CGOV`);
  }

  console.log("Network:", network.name);
  console.log("GovernanceToken:", governanceTokenAddress);
  console.log("Signer:", signerAddress);
  console.log("Owner:", owner);
  console.log("Mode:", canMint ? "mint" : "transfer");
  console.log("Distribution file:", filePath);
  console.log("Recipients:", entries.length);
  console.log("Total:", ethers.formatUnits(total, 18), "CGOV");

  for (const entry of entries) {
    const amount = ethers.parseUnits(entry.amount, 18);
    const label = entry.label ? `${entry.label} ` : "";
    console.log(`Processing ${label}${entry.address} -> ${entry.amount} CGOV`);
    const tx = canMint
      ? await govToken.mint(entry.address, amount)
      : await govToken.transfer(entry.address, amount);
    await tx.wait();
  }

  console.log("CGOV distribution completed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
